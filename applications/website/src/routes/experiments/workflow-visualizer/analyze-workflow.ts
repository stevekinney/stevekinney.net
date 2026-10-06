import {
  extractClaudeWorkflowCalls,
  parseClaudeWorkflowMeta,
} from '@lostgradient/skillset/workflows';
import type { ClaudeWorkflowAgentCall } from '@lostgradient/skillset/workflows';
import type {
  AnyNode,
  CallExpression,
  Expression,
  ModuleDeclaration,
  Node,
  ObjectExpression,
  Pattern,
  Program,
  Property,
  SpreadElement,
  Statement,
  Super,
} from 'acorn';

import {
  calleeName,
  childrenOf,
  endLineOf,
  isFunctionNode,
  lineOf,
  methodCall,
  parseScript,
  positionKey,
  unwrap,
  walk,
} from './workflow-ast';
import type { FunctionNode } from './workflow-ast';
import type {
  AgentStep,
  BranchArm,
  CodeStep,
  FanOutStep,
  HelperStep,
  OptionValue,
  ParallelStep,
  PhaseStep,
  PipelineStep,
  SchemaSummary,
  Step,
  WorkflowAnalysis,
  WorkflowHeader,
  WorkflowSummary,
} from './workflow-model';

/**
 * Turns a workflow script into the diagram's plain data. It reads the script
 * without running it: what each `agent()`, `parallel()`, `pipeline()`, and
 * `workflow()` call does, in the order the code reaches them. Anything else
 * that runs agents is followed into, and code that doesn't is kept as a quiet
 * "code" row, never dropped.
 */

/** The globals whose calls run agents, directly or through another workflow. */
const agentGlobals = new Set(['agent', 'parallel', 'pipeline', 'workflow']);

/** Array methods whose callback runs once per item. */
const perItemMethods = new Set(['map', 'flatMap', 'forEach', 'filter', 'some', 'every', 'reduce']);

/** How many helper expansions one diagram allows, so helpers calling helpers can't explode. */
const helperExpansionLimit = 200;

type Helper = {
  name: string;
  node: FunctionNode;
  line: number;
  runsAgents: boolean;
  referenced: boolean;
};

type Context = {
  source: string;
  /** skillset's record of each `agent()` call with literal options, by position. */
  calls: Map<string, ClaudeWorkflowAgentCall>;
  /** Top-level `const` initializers, for options written as a variable. */
  constants: Map<string, Expression>;
  helpers: Map<string, Helper>;
  phaseDetails: Map<string, string>;
  /** Helpers being expanded right now, outermost first. */
  stack: string[];
  expansions: number;
  nextId: () => string;
};

const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

const shorten = (text: string, limit: number): string =>
  text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;

const sourceOf = (context: Context, node: Node): string =>
  squash(context.source.slice(node.start, node.end));

const preview = (context: Context, node: Node, limit = 90): string =>
  shorten(sourceOf(context, node), limit);

/** Prose with every interpolation kept as a visible `${…}` placeholder. */
const renderText = (context: Context, node: Expression | SpreadElement | Super): string => {
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : sourceOf(context, node);
  }

  if (node.type === 'TemplateLiteral') {
    return node.quasis
      .map((quasi, index) => {
        const expression = node.expressions[index];
        const text = quasi.value.cooked ?? quasi.value.raw;

        return expression ? `${text}\${${sourceOf(context, expression)}}` : text;
      })
      .join('');
  }

  if (
    node.type === 'BinaryExpression' &&
    node.operator === '+' &&
    node.left.type !== 'PrivateIdentifier'
  ) {
    return renderText(context, node.left) + renderText(context, node.right);
  }

  return `\${${sourceOf(context, node)}}`;
};

const isMetaExport = (statement: Statement | ModuleDeclaration): boolean =>
  statement.type === 'ExportNamedDeclaration' &&
  statement.declaration?.type === 'VariableDeclaration' &&
  statement.declaration.declarations.some(
    (declarator) => declarator.id.type === 'Identifier' && declarator.id.name === 'meta',
  );

/** True when a list of steps has anything besides quiet code. */
const meaningful = (steps: readonly Step[]): boolean =>
  steps.some((step) => step.kind !== 'code' || !step.muted);

const codeStep = (
  context: Context,
  node: Node,
  {
    muted = true,
    note = null,
    text,
  }: { muted?: boolean; note?: string | null; text?: string } = {},
): CodeStep => ({
  kind: 'code',
  id: context.nextId(),
  line: lineOf(node),
  endLine: endLineOf(node),
  statements: [text ?? preview(context, node)],
  muted,
  note,
});

/** Adds a step, folding a run of quiet code into one row. */
const append = (target: Step[], step: Step): void => {
  const last = target.at(-1);
  if (step.kind === 'code' && step.muted && last?.kind === 'code' && last.muted && !last.note) {
    last.statements.push(...step.statements);
    last.endLine = step.endLine;
    return;
  }

  target.push(step);
};

/** Names the variable a step's result lands in, when one step clearly produces it. */
const assignResult = (steps: Step[], name: string): Step[] => {
  const producers = steps.filter((step) => step.kind !== 'code');
  const [only] = producers;
  if (producers.length === 1 && only && 'result' in only) only.result = name;

  return steps;
};

const literalString = (node: Expression | SpreadElement | undefined): string | null => {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
  }

  return null;
};

const propertyName = (property: Property): string | null => {
  if (property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal') return String(property.key.value);

  return null;
};

// Agents

/** The options object as written, or the top-level constant it names. */
const optionsObject = (
  context: Context,
  argument: Expression | SpreadElement | undefined,
): ObjectExpression | null => {
  if (argument?.type === 'ObjectExpression') return argument;
  if (argument?.type === 'Identifier') {
    const constant = context.constants.get(argument.name);
    if (constant?.type === 'ObjectExpression') return constant;
  }

  return null;
};

const findProperty = (options: ObjectExpression | null, name: string): Property | undefined =>
  options?.properties.find(
    (property): property is Property =>
      property.type === 'Property' && propertyName(property) === name,
  );

const optionValue = (
  context: Context,
  values: Record<string, unknown>,
  options: ObjectExpression | null,
  name: string,
): OptionValue | null => {
  if (Object.hasOwn(values, name)) {
    const value = values[name];

    return { text: typeof value === 'string' ? value : JSON.stringify(value), dynamic: false };
  }

  const property = findProperty(options, name);

  return property ? { text: preview(context, property.value, 60), dynamic: true } : null;
};

const schemaSummary = (
  context: Context,
  values: Record<string, unknown>,
  options: ObjectExpression | null,
): SchemaSummary | null => {
  const schema = values['schema'];

  if (typeof schema === 'object' && schema !== null && !Array.isArray(schema)) {
    const properties: unknown = Reflect.get(schema, 'properties');
    const required: unknown = Reflect.get(schema, 'required');
    const requiredNames = new Set(
      Array.isArray(required) ? required.filter((name) => typeof name === 'string') : [],
    );
    const names =
      typeof properties === 'object' && properties !== null ? Object.keys(properties) : [];

    return {
      readable: true,
      properties: names.map((name) => ({ name, required: requiredNames.has(name) })),
    };
  }

  const property = findProperty(options, 'schema');

  return property ? { readable: false, text: preview(context, property.value, 60) } : null;
};

/**
 * Whether the call has a `label` only the run can settle, such as
 * `Review ${file}`. A label like that is expected to vary, so it doesn't count
 * as options this page couldn't read.
 */
const hasRuntimeLabel = (
  options: ObjectExpression | null,
  values: Record<string, unknown>,
): boolean => {
  const label = findProperty(options, 'label');

  return (
    label !== undefined && !Object.hasOwn(values, 'label') && literalString(label.value) === null
  );
};

const agentStep = (context: Context, call: CallExpression): AgentStep => {
  const [prompt, optionsArgument] = call.arguments;
  const recorded = context.calls.get(positionKey(call));
  const options = optionsObject(context, optionsArgument);
  const values = recorded?.options ?? {};
  const label = findProperty(options, 'label');
  const evaluatedLabel = values['label'];
  const labelText =
    typeof evaluatedLabel === 'string'
      ? squash(evaluatedLabel)
      : label
        ? squash(renderText(context, label.value))
        : '';
  const promptText = prompt ? squash(renderText(context, prompt)) : '';
  const unresolved =
    (recorded?.unresolvedProperties ?? 0) - (hasRuntimeLabel(options, values) ? 1 : 0);

  return {
    kind: 'agent',
    id: context.nextId(),
    line: lineOf(call),
    result: null,
    title: shorten(labelText || promptText || 'An agent with no prompt', 200),
    hasLabel: labelText !== '',
    prompt: shorten(promptText, 240),
    model: optionValue(context, values, options, 'model'),
    effort: optionValue(context, values, options, 'effort'),
    isolation: optionValue(context, values, options, 'isolation'),
    agentType: optionValue(context, values, options, 'agentType'),
    phase: optionValue(context, values, options, 'phase'),
    schema: schemaSummary(context, values, options),
    unreadOptions: optionsArgument !== undefined && (!recorded || unresolved > 0),
  };
};

// Helpers

const parameterList = (context: Context, node: FunctionNode): string =>
  `(${node.params.map((parameter: Pattern) => sourceOf(context, parameter)).join(', ')})`;

const helperStep = (context: Context, site: Node, helper: Helper): HelperStep => {
  const base = {
    kind: 'helper' as const,
    id: context.nextId(),
    line: lineOf(site),
    result: null,
    name: helper.name,
    definedOn: helper.line,
  };

  if (context.stack.includes(helper.name)) return { ...base, steps: [], status: 'recursive' };
  if (context.expansions >= helperExpansionLimit) return { ...base, steps: [], status: 'limit' };

  context.expansions += 1;
  context.stack.push(helper.name);
  const steps = functionSteps(context, helper.node);
  context.stack.pop();

  return { ...base, steps, status: 'expanded' };
};

const agentHelper = (context: Context, node: AnyNode): Helper | null => {
  if (node.type !== 'Identifier') return null;
  const helper = context.helpers.get(node.name);

  return helper?.runsAgents ? helper : null;
};

/** What a function does when it's called. A function that returns a function is a thunk factory, so its result's body counts too. */
function functionSteps(context: Context, node: FunctionNode): Step[] {
  if (node.body.type === 'BlockStatement') return sequence(context, node.body.body, true);

  const body = unwrap(node.body);
  if (isFunctionNode(body)) return functionSteps(context, body);

  return expressionSteps(context, node.body);
}

/** What one item, branch, or stage runs, given as a function, a helper's name, or an expression. */
const workSteps = (context: Context, node: Expression | SpreadElement): Step[] => {
  if (isFunctionNode(node)) return functionSteps(context, node);

  const helper = agentHelper(context, node);
  if (helper) return [helperStep(context, node, helper)];

  return expressionSteps(context, node);
};

// Fan-outs

const fanOut = (
  context: Context,
  list: Expression | SpreadElement,
  via: FanOutStep['via'],
): FanOutStep => {
  const base = { kind: 'fan-out' as const, id: context.nextId(), line: lineOf(list), result: null };
  const node = list.type === 'SpreadElement' ? unwrap(list.argument) : unwrap(list);
  const mapped = methodCall(node);

  if (node.type === 'CallExpression' && mapped) {
    const [first, second] = node.arguments;
    const arrayFrom =
      mapped.method === 'from' &&
      mapped.object.type === 'Identifier' &&
      mapped.object.name === 'Array';
    const callback =
      mapped.method === 'map' || mapped.method === 'flatMap'
        ? first
        : arrayFrom
          ? second
          : undefined;
    const over = arrayFrom ? first : mapped.object;

    if (callback && over && over.type !== 'SpreadElement') {
      return {
        ...base,
        via,
        over: sourceOf(context, over),
        item:
          isFunctionNode(callback) && callback.params[0]
            ? sourceOf(context, callback.params[0])
            : null,
        branch: workSteps(context, callback),
      };
    }
  }

  // A list of work built somewhere else: the diagram can say what's fanned out, not what it runs.
  return { ...base, via, over: sourceOf(context, node), item: null, branch: [] };
};

const concurrentStep = (
  context: Context,
  call: CallExpression,
  via: FanOutStep['via'],
): ParallelStep | FanOutStep => {
  const [first] = call.arguments;
  const list = first && first.type !== 'SpreadElement' ? unwrap(first) : null;
  const empty = {
    kind: 'parallel' as const,
    id: context.nextId(),
    line: lineOf(call),
    result: null,
    via,
  };

  if (!first) return { ...empty, branches: [] };

  if (list?.type === 'ArrayExpression') {
    return {
      ...empty,
      branches: list.elements
        .filter((element): element is Expression | SpreadElement => element !== null)
        .map((element) => ({
          id: context.nextId(),
          steps:
            element.type === 'SpreadElement'
              ? [fanOut(context, element, via)]
              : // `parallel()` takes thunks to call; `Promise.all()` takes work already started.
                via === 'parallel'
                ? workSteps(context, element)
                : expressionSteps(context, element),
        })),
    };
  }

  return fanOut(context, first, via);
};

const pipelineStep = (context: Context, call: CallExpression): PipelineStep => {
  const [items, ...stages] = call.arguments;

  return {
    kind: 'pipeline',
    id: context.nextId(),
    line: lineOf(call),
    result: null,
    over: items ? sourceOf(context, items) : '',
    stages: stages.map((stage) => ({
      id: context.nextId(),
      line: lineOf(stage),
      parameters: isFunctionNode(stage)
        ? parameterList(context, stage)
        : preview(context, stage, 60),
      steps: workSteps(context, stage),
    })),
  };
};

// Expressions

/** Steps for a `.then()`, `.catch()`, or `.finally()` callback. Plain ones stay as a quiet row. */
const callbackSteps = (
  context: Context,
  method: string,
  argument: Expression | SpreadElement,
): Step[] => {
  const steps = workSteps(context, argument);
  if (meaningful(steps)) return steps;

  return [
    codeStep(context, argument, {
      text: shorten(`.${method}(${sourceOf(context, argument)})`, 90),
    }),
  ];
};

const callSteps = (context: Context, call: CallExpression): Step[] => {
  const name = calleeName(call);
  const argumentSteps = (): Step[] =>
    call.arguments.flatMap((argument) => expressionSteps(context, argument));

  if (name === 'agent') return [agentStep(context, call)];
  if (name === 'parallel') return [concurrentStep(context, call, 'parallel')];
  if (name === 'pipeline') return [pipelineStep(context, call)];

  if (name === 'workflow') {
    const [reference] = call.arguments;
    const literal = literalString(reference);

    return [
      {
        kind: 'workflow',
        id: context.nextId(),
        line: lineOf(call),
        result: null,
        reference: literal ?? (reference ? preview(context, reference, 80) : ''),
        dynamic: literal === null,
      },
    ];
  }

  if (name === 'log') {
    const [message] = call.arguments;

    return [
      {
        kind: 'log',
        id: context.nextId(),
        line: lineOf(call),
        message: message ? shorten(squash(renderText(context, message)), 200) : '',
      },
    ];
  }

  if (name !== null) {
    const helper = context.helpers.get(name);
    if (helper?.runsAgents) return [...argumentSteps(), helperStep(context, call, helper)];

    return argumentSteps();
  }

  const callee = unwrap(call.callee);
  if (isFunctionNode(callee)) return [...argumentSteps(), ...functionSteps(context, callee)];

  const member = methodCall(call);
  if (!member) return [...expressionSteps(context, callee), ...argumentSteps()];

  const { object, method } = member;
  const before = expressionSteps(context, object);

  if (
    object.type === 'Identifier' &&
    object.name === 'Promise' &&
    ['all', 'allSettled', 'race', 'any'].includes(method)
  ) {
    return [concurrentStep(context, call, 'Promise.all')];
  }

  if (method === 'then' || method === 'catch' || method === 'finally') {
    return [
      ...before,
      ...call.arguments.flatMap((argument) => callbackSteps(context, method, argument)),
    ];
  }

  const [callback] = call.arguments;
  if (perItemMethods.has(method) && callback) {
    const steps = workSteps(context, callback);
    if (meaningful(steps)) {
      return [
        ...before,
        {
          kind: 'loop',
          id: context.nextId(),
          line: lineOf(call),
          header: shorten(`${sourceOf(context, object)}.${method}(…)`, 90),
          steps,
        },
      ];
    }
  }

  return [...before, ...argumentSteps()];
};

function expressionSteps(context: Context, node: AnyNode): Step[] {
  switch (node.type) {
    case 'AwaitExpression':
      return expressionSteps(context, node.argument);
    case 'ChainExpression':
    case 'ParenthesizedExpression':
      return expressionSteps(context, node.expression);
    case 'CallExpression':
      return callSteps(context, node);
    case 'ConditionalExpression': {
      const test = expressionSteps(context, node.test);
      const consequent = expressionSteps(context, node.consequent);
      const alternate = expressionSteps(context, node.alternate);
      if (!meaningful(consequent) && !meaningful(alternate)) return test;

      return [
        ...test,
        {
          kind: 'branch',
          id: context.nextId(),
          line: lineOf(node),
          subject: null,
          arms: [
            {
              id: context.nextId(),
              kind: 'if',
              test: sourceOf(context, node.test),
              steps: consequent,
            },
            { id: context.nextId(), kind: 'else', test: null, steps: alternate },
          ],
        },
      ];
    }
    case 'AssignmentExpression':
      return assignResult(expressionSteps(context, node.right), sourceOf(context, node.left));
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return functionSteps(context, node);
    case 'Identifier':
    case 'Literal':
    case 'ThisExpression':
    case 'Super':
    case 'MetaProperty':
    case 'TemplateElement':
      return [];
    default:
      return childrenOf(node).flatMap((child) => expressionSteps(context, child));
  }
}

// Statements

/** A `phase('Title')` statement, which starts a section that runs until the next one. */
const phaseMarker = (
  context: Context,
  statement: Statement | ModuleDeclaration,
): PhaseStep | null => {
  if (statement.type !== 'ExpressionStatement') return null;
  const expression = unwrap(statement.expression);
  if (expression.type !== 'CallExpression' || calleeName(expression) !== 'phase') return null;

  const [title] = expression.arguments;
  const literal = literalString(title);

  return {
    kind: 'phase',
    id: context.nextId(),
    line: lineOf(statement),
    title: literal ?? (title ? preview(context, title, 80) : ''),
    dynamic: literal === null,
    detail: literal === null ? null : (context.phaseDetails.get(literal) ?? null),
    steps: [],
  };
};

/** `const FILES = {…}` rather than the first ninety characters of a long literal. */
const declarationPreview = (
  context: Context,
  kind: string,
  id: Pattern,
  init: Expression | null | undefined,
): string => {
  const name = sourceOf(context, id);
  if (!init) return shorten(`${kind} ${name}`, 90);

  const value = sourceOf(context, init);
  const folded =
    value.length <= 40
      ? value
      : init.type === 'ObjectExpression'
        ? '{…}'
        : init.type === 'ArrayExpression'
          ? '[…]'
          : value;

  return shorten(`${kind} ${name} = ${folded}`, 90);
};

const definitionSteps = (context: Context, name: string, node: Node): Step[] => {
  const helper = context.helpers.get(name);

  // A helper that runs agents shows up wherever it's called.
  if (helper?.runsAgents && helper.node === node && helper.referenced) return [];

  if (helper?.runsAgents && helper.node === node) {
    return [
      codeStep(context, node, {
        muted: false,
        text: shorten(`${name}${parameterList(context, helper.node)}`, 90),
        note: `\`${name}()\` runs agents, but nothing calls it, so they never run.`,
      }),
    ];
  }

  return [codeStep(context, node)];
};

const statementSteps = (
  context: Context,
  statement: Statement | ModuleDeclaration,
  inFunction: boolean,
): Step[] => {
  const block = (body: Statement): Step[] =>
    sequence(context, body.type === 'BlockStatement' ? body.body : [body], inFunction);

  switch (statement.type) {
    case 'EmptyStatement':
      return [];

    case 'BlockStatement':
      return sequence(context, statement.body, inFunction);

    case 'LabeledStatement':
      return statementSteps(context, statement.body, inFunction);

    case 'FunctionDeclaration':
      return definitionSteps(context, statement.id.name, statement);

    case 'VariableDeclaration': {
      const steps: Step[] = [];

      for (const declarator of statement.declarations) {
        const { id, init } = declarator;
        if (init && isFunctionNode(init) && id.type === 'Identifier') {
          steps.push(...definitionSteps(context, id.name, init));
          continue;
        }

        const produced = init ? expressionSteps(context, init) : [];
        if (meaningful(produced)) {
          steps.push(...assignResult(produced, sourceOf(context, id)));
        } else {
          steps.push(
            codeStep(context, declarator, {
              text: declarationPreview(context, statement.kind, id, init),
            }),
          );
        }
      }

      return steps;
    }

    case 'ExpressionStatement': {
      const steps = expressionSteps(context, statement.expression);

      return meaningful(steps) ? steps : [codeStep(context, statement)];
    }

    case 'IfStatement': {
      // The first condition runs before the branch. A later one runs only when
      // the conditions before it failed, so its agents sit inside its own arm.
      const before = expressionSteps(context, statement.test);
      const arms: BranchArm[] = [];
      let current: Statement | null | undefined = statement;

      while (current) {
        if (current.type === 'IfStatement') {
          const test = arms.length === 0 ? [] : expressionSteps(context, current.test);
          arms.push({
            id: context.nextId(),
            kind: arms.length === 0 ? 'if' : 'else if',
            test: sourceOf(context, current.test),
            steps: [...test, ...block(current.consequent)],
          });
          current = current.alternate;
        } else {
          arms.push({ id: context.nextId(), kind: 'else', test: null, steps: block(current) });
          current = null;
        }
      }

      if (!arms.some((arm) => meaningful(arm.steps))) {
        return meaningful(before)
          ? [...before, codeStep(context, statement)]
          : [codeStep(context, statement)];
      }

      return [
        ...before,
        { kind: 'branch', id: context.nextId(), line: lineOf(statement), subject: null, arms },
      ];
    }

    case 'SwitchStatement': {
      const arms: BranchArm[] = statement.cases.map((switchCase) => ({
        id: context.nextId(),
        kind: switchCase.test ? 'case' : 'default',
        test: switchCase.test ? sourceOf(context, switchCase.test) : null,
        steps: sequence(context, switchCase.consequent, inFunction),
      }));

      const before = expressionSteps(context, statement.discriminant);
      if (!arms.some((arm) => meaningful(arm.steps))) {
        return meaningful(before)
          ? [...before, codeStep(context, statement)]
          : [codeStep(context, statement)];
      }

      return [
        ...before,
        {
          kind: 'branch',
          id: context.nextId(),
          line: lineOf(statement),
          subject: sourceOf(context, statement.discriminant),
          arms,
        },
      ];
    }

    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement': {
      // What the loop reads from can run agents too, such as `for (const x of await agent(…))`.
      const before =
        statement.type === 'ForOfStatement' || statement.type === 'ForInStatement'
          ? expressionSteps(context, statement.right)
          : [];
      const test =
        statement.type === 'WhileStatement' || statement.type === 'DoWhileStatement'
          ? expressionSteps(context, statement.test)
          : [];
      const steps = [...test, ...block(statement.body)];
      if (!meaningful(steps)) return meaningful(before) ? before : [codeStep(context, statement)];

      const header =
        statement.type === 'DoWhileStatement'
          ? `do … while (${sourceOf(context, statement.test)})`
          : squash(context.source.slice(statement.start, statement.body.start));

      return [
        ...before,
        {
          kind: 'loop',
          id: context.nextId(),
          line: lineOf(statement),
          header: shorten(header, 120),
          steps,
        },
      ];
    }

    case 'TryStatement': {
      const steps = sequence(context, statement.block.body, inFunction);
      const handler = statement.handler
        ? {
            parameter: statement.handler.param ? sourceOf(context, statement.handler.param) : null,
            steps: sequence(context, statement.handler.body.body, inFunction),
          }
        : null;
      const finalizer = statement.finalizer
        ? sequence(context, statement.finalizer.body, inFunction)
        : null;

      if (!meaningful(steps) && !meaningful(handler?.steps ?? []) && !meaningful(finalizer ?? [])) {
        return [codeStep(context, statement)];
      }

      return [
        { kind: 'try', id: context.nextId(), line: lineOf(statement), steps, handler, finalizer },
      ];
    }

    case 'ReturnStatement': {
      const { argument } = statement;

      if (inFunction) {
        if (!argument) return [codeStep(context, statement)];
        const inner = unwrap(argument);
        // A function returned from a factory is the work itself, such as a thunk for `parallel()`.
        if (isFunctionNode(inner)) return functionSteps(context, inner);
        const steps = expressionSteps(context, argument);

        return meaningful(steps) ? steps : [codeStep(context, statement)];
      }

      return [
        ...(argument ? expressionSteps(context, argument) : []),
        {
          kind: 'return',
          id: context.nextId(),
          line: lineOf(statement),
          expression: argument ? preview(context, argument, 200) : null,
        },
      ];
    }

    case 'ThrowStatement':
      return [codeStep(context, statement, { muted: false })];

    case 'ExportNamedDeclaration':
      return statement.declaration
        ? statementSteps(context, statement.declaration, inFunction)
        : [codeStep(context, statement)];

    default:
      return [codeStep(context, statement)];
  }
};

/** A list of statements, split into phase sections where `phase()` is called. */
function sequence(
  context: Context,
  statements: readonly (Statement | ModuleDeclaration)[],
  inFunction: boolean,
): Step[] {
  const steps: Step[] = [];
  let section: PhaseStep | null = null;

  for (const statement of statements) {
    if (!inFunction && isMetaExport(statement)) continue;

    const phase = phaseMarker(context, statement);
    if (phase) {
      section = phase;
      steps.push(phase);
      continue;
    }

    const target = section ? section.steps : steps;
    for (const step of statementSteps(context, statement, inFunction)) append(target, step);
  }

  return steps;
}

// Setup

const topLevelConstants = (program: Program): Map<string, Expression> => {
  const constants = new Map<string, Expression>();

  for (const statement of program.body) {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') continue;
    for (const { id, init } of statement.declarations) {
      if (id.type === 'Identifier' && init) constants.set(id.name, init);
    }
  }

  return constants;
};

/** Every named function in the script: top-level ones first, so they win a name clash. */
const collectHelpers = (program: Program): Map<string, Helper> => {
  const helpers = new Map<string, Helper>();
  const add = (name: string, node: FunctionNode, line: number): void => {
    if (!helpers.has(name)) {
      helpers.set(name, { name, node, line, runsAgents: false, referenced: false });
    }
  };
  const collect = (node: AnyNode): void => {
    if (node.type === 'FunctionDeclaration' && node.id) add(node.id.name, node, lineOf(node));
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      isFunctionNode(node.init)
    ) {
      add(node.id.name, node.init, lineOf(node));
    }
  };

  for (const statement of program.body) {
    collect(statement);
    if (statement.type === 'VariableDeclaration') statement.declarations.forEach(collect);
  }
  walk(program, collect);

  // How often each name appears. A helper's own name appears once where it's declared.
  const mentions = new Map<string, number>();
  walk(program, (node) => {
    if (node.type === 'Identifier') mentions.set(node.name, (mentions.get(node.name) ?? 0) + 1);
  });

  const direct = (helper: Helper): boolean => {
    let found = false;
    walk(helper.node, (node) => {
      const name = calleeName(node);
      if (name !== null && agentGlobals.has(name)) found = true;
    });

    return found;
  };

  const namesUsed = (helper: Helper): Set<string> => {
    const names = new Set<string>();
    walk(helper.node.body, (node) => {
      if (node.type === 'Identifier') names.add(node.name);
    });

    return names;
  };

  const uses = new Map([...helpers.values()].map((helper) => [helper.name, namesUsed(helper)]));
  for (const helper of helpers.values()) {
    helper.runsAgents = direct(helper);
    helper.referenced = (mentions.get(helper.name) ?? 0) > 1;
  }

  // A helper that calls a helper that runs agents runs agents too.
  let changed = true;
  while (changed) {
    changed = false;
    for (const helper of helpers.values()) {
      if (helper.runsAgents) continue;
      const names = uses.get(helper.name) ?? new Set<string>();
      if ([...names].some((name) => name !== helper.name && helpers.get(name)?.runsAgents)) {
        helper.runsAgents = true;
        changed = true;
      }
    }
  }

  return helpers;
};

const summarize = (
  program: Program,
  calls: ReturnType<typeof extractClaudeWorkflowCalls>,
  phaseCount: number,
): WorkflowSummary => {
  const agentCalls = new Map<string, CallExpression>();
  let fanOuts = 0;

  walk(program, (node) => {
    if (node.type !== 'CallExpression') return;
    const name = calleeName(node);
    const [first] = node.arguments;
    const overList = first !== undefined && unwrapArgument(first).type !== 'ArrayExpression';
    const member = methodCall(node);
    const promiseAll =
      member?.object.type === 'Identifier' &&
      member.object.name === 'Promise' &&
      (member.method === 'all' || member.method === 'allSettled');

    if (name === 'agent') agentCalls.set(positionKey(node), node);
    if (name === 'pipeline' || ((name === 'parallel' || promiseAll) && overList)) fanOuts += 1;
  });

  if (!calls.ok) {
    return {
      agentCalls: agentCalls.size,
      fanOuts,
      phases: phaseCount,
      models: [],
      sessionModelAgents: 0,
      unreadOptions: 0,
    };
  }

  const models: string[] = [];
  let sessionModelAgents = 0;
  let unreadOptions = 0;
  const recorded = new Set<string>();

  for (const call of calls.agents) {
    const key = `${call.line}:${call.column}`;
    recorded.add(key);
    const model = call.options['model'];
    if (typeof model === 'string' && !models.includes(model)) models.push(model);

    const node = agentCalls.get(key);
    const options = node ? optionsNodeOf(node, program) : null;
    const unresolved = call.unresolvedProperties - (hasRuntimeLabel(options, call.options) ? 1 : 0);
    if (unresolved > 0) unreadOptions += 1;
    else if (model === undefined) sessionModelAgents += 1;
  }

  // Calls with no options object skillset could read: no options at all, or a runtime value.
  let withoutOptions = 0;
  let withRuntimeOptions = 0;
  for (const [key, node] of agentCalls) {
    if (recorded.has(key)) continue;
    if (node.arguments.length < 2) withoutOptions += 1;
    else withRuntimeOptions += 1;
  }
  const unlisted = calls.agentsWithoutLiteralOptions;
  const plain = Math.min(withoutOptions, unlisted);

  return {
    agentCalls: calls.agents.length + unlisted,
    fanOuts,
    phases: phaseCount,
    models,
    sessionModelAgents: sessionModelAgents + plain,
    unreadOptions: unreadOptions + Math.min(withRuntimeOptions, unlisted - plain),
  };
};

const unwrapArgument = (node: Expression | SpreadElement): AnyNode =>
  node.type === 'SpreadElement' ? node : unwrap(node);

/** The options object of an `agent()` call, following a top-level constant. */
const optionsNodeOf = (call: CallExpression, program: Program): ObjectExpression | null => {
  const [, options] = call.arguments;
  if (options?.type === 'ObjectExpression') return options;
  if (options?.type !== 'Identifier') return null;
  const constant = topLevelConstants(program).get(options.name);

  return constant?.type === 'ObjectExpression' ? constant : null;
};

/** Reads a workflow script into the diagram's steps, a header from `meta`, and counts. */
export const analyzeWorkflow = (source: string): WorkflowAnalysis => {
  const parsed = parseScript(source);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { program } = parsed;
  const meta = parseClaudeWorkflowMeta(source);
  const calls = extractClaudeWorkflowCalls(source);
  const phases = meta.ok ? (meta.meta.phases ?? []) : [];

  let counter = 0;
  const context: Context = {
    source,
    calls: new Map(
      calls.ok ? calls.agents.map((call) => [`${call.line}:${call.column}`, call] as const) : [],
    ),
    constants: topLevelConstants(program),
    helpers: collectHelpers(program),
    phaseDetails: new Map(
      phases.flatMap((phase) => (phase.detail ? [[phase.title, phase.detail] as const] : [])),
    ),
    stack: [],
    expansions: 0,
    nextId: () => `step-${(counter += 1)}`,
  };

  const header: WorkflowHeader | null = meta.ok
    ? {
        name: meta.meta.name,
        title: meta.meta.title || null,
        description: meta.meta.description,
        whenToUse: meta.meta.whenToUse || null,
      }
    : null;

  const usedTitles = new Set(
    calls.ok ? calls.phases.flatMap((use) => (use.title === undefined ? [] : [use.title])) : [],
  );
  const phaseCount = meta.ok && meta.meta.phases ? meta.meta.phases.length : usedTitles.size;

  return {
    ok: true,
    header,
    steps: sequence(context, program.body, false),
    summary: summarize(program, calls, phaseCount),
  };
};
