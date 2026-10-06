import {
  checkClaudeWorkflowPhases,
  claudeWorkflowAgentOptionsSchema,
  claudeWorkflowEffortSchema,
  claudeWorkflowOutputSchemaSchema,
  extractClaudeWorkflowCalls,
  findClaudeWorkflowForbiddenApis,
  parseClaudeWorkflowMeta,
} from '@lostgradient/skillset/workflows';
import type {
  ClaudeWorkflowForbiddenApi,
  ClaudeWorkflowPhaseUse,
} from '@lostgradient/skillset/workflows';
import type { AnyNode, Expression, Program, SpreadElement, Super } from 'acorn';

import { calleeName, isFunctionNode, methodCall, parseScript, unwrap, walk } from './workflow-ast';
import type { WorkflowCheck } from './workflow-model';

/**
 * The checks under the summary: what Claude Code would refuse or trip over in
 * a script, plus one habit worth breaking. Messages mark code with backticks.
 */

const code = (text: string): string => `\`${text}\``;

const list = (items: readonly string[]): string => {
  const quoted = items.map(code);
  if (quoted.length <= 2) return quoted.join(' or ');

  return `${quoted.slice(0, -1).join(', ')}, or ${quoted.at(-1)}`;
};

const forbiddenMessages: Record<ClaudeWorkflowForbiddenApi['api'], string> = {
  'Date.now':
    '`Date.now()` throws in a workflow, because a resumed run would see a different time and call different agents. Pass a timestamp in through `args` instead.',
  'new Date()':
    '`new Date()` with no arguments throws in a workflow, because a resumed run would see a different time. Pass a timestamp in through `args` instead.',
  'Math.random':
    '`Math.random()` throws in a workflow, because a resumed run would make different choices. Pass a seed in through `args`, or pick by index.',
  'import()':
    '`import()` stops the script before it starts: a workflow is plain JavaScript and can’t load modules.',
};

/** Where an issue sits in an options object, such as `schema.properties`. */
const pathText = (path: readonly PropertyKey[]): string =>
  path.map((part) => (typeof part === 'symbol' ? part.toString() : String(part))).join('.');

/** A value as a script would write it, such as `'extreme'`. */
const literalText = (value: unknown): string =>
  typeof value === 'string' ? `'${value}'` : (JSON.stringify(value) ?? String(value));

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

const knownOptions = new Set(Object.keys(claudeWorkflowAgentOptionsSchema.shape));

const agentOptionChecks = (line: number, options: Record<string, unknown>): WorkflowCheck[] => {
  const checks: WorkflowCheck[] = [];
  const at = `${code('agent()')} on line ${line}`;
  const { schema, ...rest } = options;

  const parsed = claudeWorkflowAgentOptionsSchema.safeParse(rest);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const [key] = issue.path;
      const message =
        key === 'effort'
          ? `${code('effort')} must be ${list(claudeWorkflowEffortSchema.options)}, not ${code(literalText(rest['effort']))}.`
          : key === 'isolation'
            ? `${code('isolation')} can only be ${code('worktree')}.`
            : `${code(pathText(issue.path))}: ${lowerFirst(issue.message)}.`;

      checks.push({ severity: 'error', message: `${at}: ${message}`, line });
    }
  }

  if (schema !== undefined) {
    const schemaParsed = claudeWorkflowOutputSchemaSchema.safeParse(schema);
    if (!schemaParsed.success) {
      for (const issue of schemaParsed.error.issues) {
        const where = issue.path.length > 0 ? ` at ${code(pathText(issue.path))}` : '';
        checks.push({
          severity: 'error',
          message: `${at}: the output schema${where} ${lowerFirst(issue.message)}. It must be an object with ${code('properties')}.`,
          line,
        });
      }
    }
  }

  for (const key of Object.keys(rest)) {
    if (knownOptions.has(key)) continue;
    checks.push({
      severity: 'warning',
      message: `${at}: ${code(key)} isn’t an ${code('agent()')} option, so it’s ignored.`,
      line,
    });
  }

  return checks;
};

const phaseChecks = (
  uses: readonly ClaudeWorkflowPhaseUse[],
  titles: readonly string[],
): WorkflowCheck[] => {
  const { unlisted, unused } = checkClaudeWorkflowPhases(uses, titles);

  return [
    ...unlisted.map((use): WorkflowCheck => ({
      severity: 'warning',
      message: `${use.source === 'phase-call' ? code(`phase('${use.title ?? ''}')`) : code(`phase: '${use.title ?? ''}'`)} on line ${use.line} matches no ${code('meta.phases')} title, so its agents get a progress group of their own. Titles have to match exactly.`,
      line: use.line,
    })),
    ...unused.map((title): WorkflowCheck => ({
      severity: 'warning',
      message: `${code('meta.phases')} lists ${code(title)}, but no ${code('phase()')} call or ${code('phase')} option uses it.`,
      line: null,
    })),
  ];
};

const isConcurrentCall = (node: AnyNode): boolean => {
  const name = calleeName(node);

  return name === 'parallel' || name === 'pipeline';
};

/** The variable or call a method chain starts from, such as `reviews` in `reviews.flat().filter(…)`. */
const chainRoot = (node: Expression | Super): Expression | Super => {
  const inner = unwrap(node);
  if (isConcurrentCall(inner)) return inner;

  const member = methodCall(inner);
  if (member) return chainRoot(member.object);
  if (inner.type === 'MemberExpression') return chainRoot(inner.object);

  return inner;
};

/** `Boolean`, or a callback that returns its own argument, such as `(item) => item`. */
const dropsFalsy = (argument: Expression | SpreadElement | undefined): boolean => {
  if (!argument) return false;
  if (argument.type === 'Identifier') return argument.name === 'Boolean';
  if (!isFunctionNode(argument)) return false;

  const [parameter] = argument.params;
  const body = argument.body.type === 'BlockStatement' ? null : unwrap(argument.body);

  return (
    parameter?.type === 'Identifier' && body?.type === 'Identifier' && body.name === parameter.name
  );
};

/**
 * A failed item in `parallel()` or `pipeline()` comes back as `null`, and
 * `.filter(Boolean)` drops it without a trace. Flags that on a fan-out's
 * result, whether it's filtered directly or through a variable.
 */
const silentDrops = (program: Program, source: string): WorkflowCheck[] => {
  const results = new Set<string>();
  walk(program, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init) return;
    if (isConcurrentCall(unwrap(node.init))) results.add(node.id.name);
  });

  const checks: WorkflowCheck[] = [];
  walk(program, (node) => {
    const member = methodCall(node);
    if (node.type !== 'CallExpression' || member?.method !== 'filter') return;
    if (!dropsFalsy(node.arguments[0])) return;

    const root = chainRoot(member.object);
    const fromVariable = root.type === 'Identifier' && results.has(root.name);
    if (!fromVariable && !isConcurrentCall(root)) return;

    const line = node.loc?.start.line ?? null;
    const name = root.type === 'Identifier' ? root.name : 'results';
    const filter = source.slice(member.object.end, node.end).replace(/^\s*\??\./, '.');

    checks.push({
      severity: 'warning',
      message: `${code(filter.length <= 40 ? filter : '.filter(Boolean)')}${line ? ` on line ${line}` : ''} drops the ${code('null')} a failed item leaves behind, so a failure disappears without a trace. Count them first and report the number, such as ${code(`${name}.filter((item) => item === null).length`)}.`,
      line,
    });
  });

  return checks;
};

/** Checks a workflow script. A script that doesn't parse gets one error and nothing else. */
export const checkWorkflow = (source: string): WorkflowCheck[] => {
  const parsed = parseScript(source);
  if (!parsed.ok) {
    const { message, line } = parsed.error;

    return [
      {
        severity: 'error',
        message: `The script doesn’t parse${line ? ` at line ${line}` : ''}: ${message}.`,
        line,
      },
    ];
  }

  const checks: WorkflowCheck[] = [];

  const meta = parseClaudeWorkflowMeta(source);
  if (!meta.ok) {
    const message = meta.error.replace(
      /^(meta(?:\.[\w.]+)?):/,
      (_, path: string) => `${code(path)}:`,
    );
    checks.push({
      severity: 'error',
      message: `Claude Code won’t list this workflow: ${message}`,
      line: meta.line ?? null,
    });
  }

  const forbidden = findClaudeWorkflowForbiddenApis(source);
  if (forbidden.ok) {
    for (const usage of forbidden.usages) {
      checks.push({
        severity: 'error',
        message: `Line ${usage.line}: ${forbiddenMessages[usage.api]}`,
        line: usage.line,
      });
    }
  }

  const calls = extractClaudeWorkflowCalls(source);
  if (calls.ok) {
    for (const agent of calls.agents) checks.push(...agentOptionChecks(agent.line, agent.options));

    const titles = meta.ok ? meta.meta.phases?.map((phase) => phase.title) : undefined;
    if (titles) checks.push(...phaseChecks(calls.phases, titles));
  }

  checks.push(...silentDrops(parsed.program, source));

  return checks.sort(
    (first, second) =>
      (first.severity === second.severity ? 0 : first.severity === 'error' ? -1 : 1) ||
      (first.line ?? Number.MAX_SAFE_INTEGER) - (second.line ?? Number.MAX_SAFE_INTEGER),
  );
};
