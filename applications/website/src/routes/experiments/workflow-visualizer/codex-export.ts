import { parse } from 'acorn';
import {
  extractClaudeWorkflowCalls,
  parseClaudeWorkflowMeta,
} from '@lostgradient/skillset/workflows';
import type { ClaudeWorkflowCalls, ClaudeWorkflowMeta } from '@lostgradient/skillset/workflows';

import {
  inheritedModelKey,
  type CodexExportOptions,
  type CompatibilityNote,
} from './codex-export-options';
import { toStrictSchema } from './codex-runtime.js';
import runtimeSource from './codex-runtime.js?raw';

export type {
  CodexExportOptions,
  CodexSandboxMode,
  CompatibilityNote,
} from './codex-export-options';

/**
 * Converts a Claude Code workflow script into one self-contained ES module
 * that runs the same script body on the Codex SDK: a header, the imports, an
 * editable `CONFIG`, the runtime from `codex-runtime.js` verbatim, the
 * original `meta`, the body wrapped in an async function, and an entry point.
 */

export type CodexExportResult =
  | { ok: true; fileName: string; text: string; notes: CompatibilityNote[] }
  | { ok: false; error: string };

export type WorkflowModelUse = { name: string; calls: number; line: number };

export type WorkflowModels =
  | {
      ok: true;
      /** Each model name the script's `agent()` calls pass, in order of first use. */
      models: WorkflowModelUse[];
      /** `agent()` calls with no `model` the converter can read: none at all, or one computed at run time. */
      inherited: { calls: number; line?: number };
    }
  | { ok: false; error: string };

type AgentCall = Extract<ClaudeWorkflowCalls, { ok: true }>['agents'][number];

type AstNode = {
  type: string;
  start: number;
  end: number;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
};

/** What Claude Code allows each agent's structured output, before it throws. */
const STRUCTURED_OUTPUT_ATTEMPTS = 5;

const UNSUPPORTED_OPTIONS: Record<string, string> = {
  agentType: 'Codex has no subagent types, so every agent runs as a plain Codex thread.',
  disallowedTools:
    'Codex can’t take tools away from one thread; `CONFIG.sandboxMode` limits what every agent can do.',
  bashCommandClamp:
    'Codex has no per-thread command allow list; the sandbox decides what commands can do.',
  stallMs: 'There’s no stall timer; an agent runs until its Codex turn ends.',
};

const parseOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  locations: true,
} as const;

/** A literal for a note: wrapped in backticks, with any backtick inside made harmless. */
const code = (value: string): string => `\`${value.replaceAll('`', "'")}\``;

const count = (amount: number, singular: string, plural = `${singular}s`): string =>
  `${amount} ${amount === 1 ? singular : plural}`;

const list = (items: readonly string[]): string =>
  items.length <= 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;

/** A single-quoted JavaScript string literal. */
const quote = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}'`;

const objectKey = (name: string): string => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name));

/** Text on one line, safe inside a `//` comment. */
const oneLine = (value: string): string => value.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

/** Wrap text into `//` comment lines no wider than `width`. */
const commentLines = (text: string, indent = '', width = 92): string[] => {
  const lines: string[] = [];
  let current = '';
  for (const word of oneLine(text).split(/\s+/)) {
    if (current && `${current} ${word}`.length > width - indent.length - 3) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.map(
    (line, index) => `//${index === 0 ? indent : ' '.repeat(indent.length)} ${line}`,
  );
};

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The line of the first place the script reads a global such as `args`, if it does. */
const firstReference = (program: AstNode, name: string): number | undefined => {
  let line: number | undefined;
  const visit = (node: AstNode, parent: AstNode | undefined, key: string): void => {
    if (line !== undefined) return;
    if (node.type === 'Identifier' && node['name'] === name) {
      const isMemberName =
        parent?.type === 'MemberExpression' && key === 'property' && !parent['computed'];
      const isKeyName =
        (parent?.type === 'Property' || parent?.type === 'MethodDefinition') &&
        key === 'key' &&
        !parent['computed'] &&
        !parent['shorthand'];
      if (!isMemberName && !isKeyName) {
        line = node.loc?.start.line;
        return;
      }
    }
    for (const [childKey, value] of Object.entries(node)) {
      for (const item of Array.isArray(value) ? value : [value])
        if (isAstNode(item)) visit(item, node, childKey);
    }
  };
  visit(program, undefined, '');
  return line;
};

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

/** `review-changed-files` stays as it is; anything a file name can't hold becomes `-`. */
const safeFileStem = (name: string): string =>
  name
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[.-]+|-+$/g, '') || 'workflow';

const modelsFrom = (calls: Extract<ClaudeWorkflowCalls, { ok: true }>) => {
  const uses = new Map<string, WorkflowModelUse>();
  let inheritedCalls = calls.agentsWithoutLiteralOptions;
  let inheritedLine: number | undefined;
  for (const call of calls.agents) {
    const model = call.options['model'];
    if (typeof model === 'string') {
      const use = uses.get(model);
      if (use) use.calls += 1;
      else uses.set(model, { name: model, calls: 1, line: call.line });
    } else {
      inheritedCalls += 1;
      inheritedLine ??= call.line;
    }
  }
  return {
    models: [...uses.values()],
    inherited: { calls: inheritedCalls, line: inheritedLine },
  };
};

/** The model names a workflow script passes to `agent()`, for the model-mapping table. */
export const listClaudeModels = (source: string): WorkflowModels => {
  const calls = extractClaudeWorkflowCalls(source);
  if (!calls.ok) return { ok: false, error: calls.error };
  return { ok: true, ...modelsFrom(calls) };
};

const mappedModel = (options: CodexExportOptions, name: string): string | null =>
  options.models[name]?.trim() || null;

const describeTarget = (model: string | null): string =>
  model ? code(model) : 'Codex’s default model';

/** Stands for a spread or a computed key in an `agent()` options object. */
const SPREAD = '...';

/** Options whose value changes what the export does, so a computed one is worth a note. */
const CONSEQUENTIAL_OPTIONS = new Set(['model', 'schema', 'effort', 'isolation']);

/** Every `agent(prompt, options)` call in the script, by `line:column`. */
const findAgentCalls = (program: AstNode): Map<string, AstNode> => {
  const found = new Map<string, AstNode>();
  const visit = (node: AstNode): void => {
    const callee = node['callee'];
    if (
      node.type === 'CallExpression' &&
      isAstNode(callee) &&
      callee.type === 'Identifier' &&
      callee['name'] === 'agent' &&
      node.loc
    )
      found.set(`${node.loc.start.line}:${node.loc.start.column}`, node);
    for (const value of Object.values(node))
      for (const item of Array.isArray(value) ? value : [value]) if (isAstNode(item)) visit(item);
  };
  visit(program);
  return found;
};

/**
 * The consequential options of an `agent()` call that are computed at run time,
 * with `...` for a spread or computed key, which could be any of them.
 */
const computedOptionNames = (agentCalls: Map<string, AstNode>, call: AgentCall): string[] => {
  if (call.unresolvedProperties === 0) return [];
  const node = agentCalls.get(`${call.line}:${call.column}`);
  const argumentList = node?.['arguments'];
  const options = Array.isArray(argumentList) ? argumentList[1] : undefined;
  if (!isAstNode(options) || options.type !== 'ObjectExpression') return [SPREAD];
  const properties = Array.isArray(options['properties']) ? options['properties'] : [];
  const names = properties.flatMap((property: unknown): string[] => {
    if (!isAstNode(property) || property.type !== 'Property' || property['computed'])
      return [SPREAD];
    const key = property['key'];
    const name = isAstNode(key) ? (key['name'] ?? key['value']) : undefined;
    if (typeof name !== 'string') return [SPREAD];
    return name in call.options || !CONSEQUENTIAL_OPTIONS.has(name) ? [] : [name];
  });
  return [...new Set(names)];
};

type NoteContext = {
  meta: ClaudeWorkflowMeta;
  calls: Extract<ClaudeWorkflowCalls, { ok: true }>;
  agentCalls: Map<string, AstNode>;
  options: CodexExportOptions;
  fileName: string;
  argsLine: number | undefined;
  budgetLine: number | undefined;
};

/** Where in a schema, for a note: the root, or a data path such as `findings[].line`. */
const describePath = (path: string): string => (path === '' ? 'the root' : code(path));

const schemaNotes = (call: AgentCall): CompatibilityNote[] => {
  const schema = call.options['schema'];
  if (schema === undefined) return [];
  if (!isPlainObject(schema) || schema['type'] !== 'object' || !isPlainObject(schema['properties']))
    return [
      {
        severity: 'warning',
        feature: 'Structured output',
        message:
          'This `schema` isn’t an object with `properties`, so the agent throws when it runs, as it would in Claude Code.',
        line: call.line,
      },
    ];

  const { nullablePaths, droppedKeywords, rewrites } = toStrictSchema(schema);
  const notes: CompatibilityNote[] = [];
  if (nullablePaths.length > 0)
    notes.push({
      severity: 'info',
      feature: 'Structured output',
      message: `Codex requires every property, so optional ${list(nullablePaths.map(describePath))} ${nullablePaths.length === 1 ? 'is' : 'are'} sent as nullable. The script removes those \`null\`s before checking the reply against your schema.`,
      line: call.line,
    });
  if (droppedKeywords.length > 0)
    notes.push({
      severity: 'warning',
      feature: 'Structured output',
      message: `Codex’s strict mode can’t take ${list(droppedKeywords.map(({ path, keyword }) => `${code(keyword)} at ${describePath(path)}`))}, so the model isn’t held to ${droppedKeywords.length === 1 ? 'it' : 'them'}. The script checks each reply against your schema and asks again, up to ${STRUCTURED_OUTPUT_ATTEMPTS} tries in all.`,
      line: call.line,
    });
  if (rewrites.length > 0)
    notes.push({
      severity: 'warning',
      feature: 'Structured output',
      message: `In the schema sent to Codex, ${list(rewrites.map(({ path, message }) => `at ${describePath(path)}, ${message}`))}.`,
      line: call.line,
    });
  return notes;
};

const buildNotes = ({
  meta,
  calls,
  agentCalls,
  options,
  fileName,
  argsLine,
  budgetLine,
}: NoteContext): CompatibilityNote[] => {
  const notes: CompatibilityNote[] = [];
  const { models, inherited } = modelsFrom(calls);

  for (const use of models)
    notes.push({
      severity: 'info',
      feature: 'Models',
      message: `${count(use.calls, '`agent()` call')} with ${code(`model: '${use.name}'`)} ${use.calls === 1 ? 'runs' : 'run'} on ${describeTarget(mappedModel(options, use.name))}.`,
      line: use.line,
    });
  if (inherited.calls > 0)
    notes.push({
      severity: 'info',
      feature: 'Models',
      message: `${count(inherited.calls, '`agent()` call')} with no \`model\` ${inherited.calls === 1 ? 'runs' : 'run'} on ${describeTarget(mappedModel(options, inheritedModelKey))}, where Claude Code would use the session’s model.`,
      ...(inherited.line === undefined ? {} : { line: inherited.line }),
    });

  const efforts = calls.agents.filter((call) => typeof call.options['effort'] === 'string');
  if (efforts.length > 0) {
    const names = [...new Set(efforts.map((call) => String(call.options['effort'])))];
    notes.push({
      severity: 'info',
      feature: 'Effort',
      message: `\`effort\` becomes Codex’s \`modelReasoningEffort\` with the same name (${list(names.map(code))}).`,
      line: efforts[0]?.line,
    });
  }

  for (const call of calls.agents) notes.push(...schemaNotes(call));

  // Options the converter can't read, but the runtime handles when the script runs.
  const computed = calls.agents
    .map((call) => ({ call, names: computedOptionNames(agentCalls, call) }))
    .filter(({ names }) => names.length > 0);
  if (computed.length > 0 || calls.agentsWithoutLiteralOptions > 0) {
    const total = computed.length + calls.agentsWithoutLiteralOptions;
    const names = [...new Set(computed.flatMap((entry) => entry.names))].map((name) =>
      name === SPREAD ? 'spread options' : code(name),
    );
    if (calls.agentsWithoutLiteralOptions > 0) names.push('options passed as a variable');
    notes.push({
      severity: 'info',
      feature: 'Options computed at run time',
      message: `${count(total, '`agent()` call')} ${total === 1 ? 'has' : 'have'} ${list(names)} the converter can’t read ahead of time. The script handles them when it runs: it looks up a \`model\` in \`CONFIG.models\` (with no entry, Codex’s default) and converts a \`schema\` to strict mode then.`,
      ...(computed[0] ? { line: computed[0].call.line } : {}),
    });
  }

  const worktrees = calls.agents.filter((call) => call.options['isolation'] === 'worktree');
  if (worktrees.length > 0)
    notes.push({
      severity: 'warning',
      feature: 'Worktrees',
      message: `${count(worktrees.length, '`agent()` call')} with \`isolation: 'worktree'\` ${worktrees.length === 1 ? 'gets' : 'get'} a new git worktree per agent on a new branch in a temporary folder, and the script leaves it there. Claude Code removes a worktree with no changes; here, remove each one with \`git worktree remove\`.`,
      line: worktrees[0]?.line,
    });
  const otherIsolation = calls.agents.find(
    (call) => 'isolation' in call.options && call.options['isolation'] !== 'worktree',
  );
  if (otherIsolation)
    notes.push({
      severity: 'warning',
      feature: 'Worktrees',
      message: `${code(`isolation: '${String(otherIsolation.options['isolation'])}'`)} throws when the agent runs; only \`'worktree'\` is available.`,
      line: otherIsolation.line,
    });

  for (const [option, explanation] of Object.entries(UNSUPPORTED_OPTIONS)) {
    const users = calls.agents.filter((call) => option in call.options);
    if (users.length > 0)
      notes.push({
        severity: 'warning',
        feature: 'Unsupported options',
        message: `${code(option)} is ignored, with a warning when the script runs. ${explanation}`,
        line: users[0]?.line,
      });
  }

  for (const reference of calls.workflowReferences) {
    const target = reference.reference;
    const name =
      typeof target === 'string'
        ? target
        : isPlainObject(target) && typeof target['scriptPath'] === 'string'
          ? target['scriptPath']
          : 'that workflow';
    notes.push({
      severity: 'warning',
      feature: 'Nested workflows',
      message: `${code(`workflow('${name}')`)} throws when it runs, because nested workflows aren’t converted. Convert ${code(name)} too and call it from this script.`,
      line: reference.line,
    });
  }
  if (calls.workflowReferencesUnresolved > 0)
    notes.push({
      severity: 'warning',
      feature: 'Nested workflows',
      message: `${count(calls.workflowReferencesUnresolved, '`workflow()` call')} with a computed name ${calls.workflowReferencesUnresolved === 1 ? 'throws' : 'throw'} when it runs, because nested workflows aren’t converted. Convert each one and call it from this script.`,
    });

  if (budgetLine !== undefined)
    notes.push({
      severity: 'info',
      feature: 'Budget',
      message:
        '`budget.total` is `null` unless you set `CONFIG.budgetTotal`. `budget.spent()` counts the output tokens of this run’s Codex turns, reasoning included; Claude Code counts the whole turn, main conversation included.',
      line: budgetLine,
    });

  if (argsLine !== undefined)
    notes.push({
      severity: 'info',
      feature: 'Arguments',
      message: `Pass \`args\` as JSON in the first command-line argument, such as ${code(`node ${fileName} '{"base":"main"}'`)}. Leave it out and \`args\` is \`undefined\`, as in Claude Code.`,
      line: argsLine,
    });

  if (meta.phases?.some((phase) => phase.model !== undefined))
    notes.push({
      severity: 'info',
      feature: 'Phases',
      message:
        '`meta.phases[].model` only labels the progress view in Claude Code, so the export ignores it. Each agent’s own `model` decides.',
    });

  notes.push({
    severity: 'info',
    feature: 'Concurrency',
    message:
      'Up to `min(16, max(2, CPUs - 2))` agents run at once, as in Claude Code; the rest wait their turn. Set `WORKFLOW_MAX_CONCURRENT_AGENTS` (1–256) to change it.',
  });

  const sandbox = options.sandboxMode;
  const network = options.networkAccessEnabled ? 'on' : 'off';
  notes.push(
    sandbox === 'workspace-write'
      ? {
          severity: 'info',
          feature: 'Sandbox',
          message: `Agents run with \`sandboxMode: 'workspace-write'\`, so they can edit files in the working directory (\`codex exec\` defaults to \`'read-only'\`), with network access ${network}. \`approvalPolicy\` is \`'never'\`, since nobody is there to answer a prompt.`,
        }
      : sandbox === 'read-only'
        ? {
            severity: 'warning',
            feature: 'Sandbox',
            message:
              "Agents run with `sandboxMode: 'read-only'`, so an agent that needs to edit a file or write one can’t. `approvalPolicy` is `'never'`, since nobody is there to answer a prompt.",
          }
        : {
            severity: 'warning',
            feature: 'Sandbox',
            message:
              "Agents run with `sandboxMode: 'danger-full-access'`: no sandbox, so they can change anything on this machine and reach the network. `approvalPolicy` is `'never'`, so nothing asks first.",
          },
  );

  notes.push(
    {
      severity: 'info',
      feature: 'Agents',
      message:
        'Each agent is a fresh Codex thread with your Codex setup: it reads `AGENTS.md` rather than `CLAUDE.md`, and has Codex’s tools and MCP servers rather than Claude Code’s, its skills, or its subagent types.',
    },
    {
      severity: 'info',
      feature: 'Resuming',
      message: 'There’s no `resumeFromRunId`: running the file again starts every agent over.',
    },
  );

  // The same message from two calls, such as one schema used twice, is one note at its first line.
  const seen = new Set<string>();
  return notes.filter((note) => {
    const key = `${note.feature}\n${note.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Notes that belong in the header's list: the mapping is in CONFIG, and args in the run line. */
const headerFeatures = (note: CompatibilityNote): boolean =>
  !['Models', 'Effort', 'Arguments'].includes(note.feature) &&
  !(note.feature === 'Structured output' && note.severity === 'info');

const header = (
  meta: ClaudeWorkflowMeta,
  fileName: string,
  notes: readonly CompatibilityNote[],
): string => {
  const usesSchemas = notes.some((note) => note.feature === 'Structured output');
  const differences = [
    ...(usesSchemas
      ? [
          'Codex sends schemas in strict mode, which requires every property, so optional ones go out as nullable. The script removes those `null`s and checks each reply against the original schema.',
        ]
      : []),
    ...notes.filter(headerFeatures).map((note) => note.message),
  ];
  const title = meta.title ? `${meta.title}, converted` : 'Converted';
  return [
    `// ${oneLine(fileName)}`,
    '//',
    ...commentLines(
      `${title} from the Claude Code workflow ${code(meta.name)} to run on the Codex SDK.`,
    ),
    ...commentLines(meta.description),
    '//',
    '// Run it with Node 18.14 or later, signed in to Codex (`npx codex login`, or set CODEX_API_KEY):',
    '//',
    '//   npm install @openai/codex-sdk ajv',
    `//   node ${oneLine(fileName)} '<args as JSON>'`,
    '//',
    ...commentLines(
      'The first argument becomes the workflow’s `args`; leave it out for `undefined`. Progress goes to stderr, and the result goes to stdout as JSON. Edit CONFIG below to choose models and the sandbox.',
    ),
    '//',
    '// How this differs from running it in Claude Code:',
    '//',
    ...differences.flatMap((message) => commentLines(message, ' -')),
  ].join('\n');
};

const configSection = (
  options: CodexExportOptions,
  models: readonly WorkflowModelUse[],
): string => {
  const names = [inheritedModelKey, ...models.map((use) => use.name)].filter(
    (name, index, all) => all.indexOf(name) === index,
  );
  const modelLines = names.map((name) => {
    const model = mappedModel(options, name);
    return `    ${objectKey(name)}: ${model === null ? 'null' : quote(model)},`;
  });
  return [
    'const CONFIG = {',
    '  // The Codex model each Claude model name in this script runs on. `null` uses Codex’s',
    '  // default model (`model` in ~/.codex/config.toml). `inherit` is for agents that set no',
    '  // model, which use the session’s model in Claude Code.',
    '  models: {',
    ...modelLines,
    '  },',
    '  // What agents may change. `codex exec` defaults to read-only, where an agent can’t edit',
    "  // files. 'danger-full-access' turns the sandbox off.",
    `  sandboxMode: ${quote(options.sandboxMode)},`,
    '  // Nobody is watching to answer an approval prompt, so agents never ask.',
    "  approvalPolicy: 'never',",
    "  // Where agents work. One with `isolation: 'worktree'` gets a new git worktree instead.",
    '  workingDirectory: process.cwd(),',
    '  // Codex won’t start outside a git repository unless this is true.',
    '  skipGitRepoCheck: false,',
    "  // Network access for commands agents run in the 'workspace-write' sandbox.",
    `  networkAccessEnabled: ${String(options.networkAccessEnabled)},`,
    '  // Agents running at once: min(16, max(2, CPUs - 2)), as in Claude Code. Set',
    '  // WORKFLOW_MAX_CONCURRENT_AGENTS (1-256) to change it without editing this file.',
    '  concurrency:',
    '    Number(process.env.WORKFLOW_MAX_CONCURRENT_AGENTS) ||',
    '    Math.min(16, Math.max(2, os.availableParallelism() - 2)),',
    '  // Replies an agent with a `schema` gets before it throws, as in Claude Code.',
    `  structuredOutputAttempts: Number(process.env.MAX_STRUCTURED_OUTPUT_RETRIES) || ${STRUCTURED_OUTPUT_ATTEMPTS},`,
    '  // What `budget.total` reports, in output tokens; `null` means no target. `budget.spent()`',
    '  // adds up `output_tokens`, which already include `reasoning_output_tokens`.',
    '  budgetTotal: null,',
    '};',
  ].join('\n');
};

const IMPORTS = [
  "import * as childProcess from 'node:child_process';",
  "import * as fs from 'node:fs';",
  "import * as os from 'node:os';",
  "import * as path from 'node:path';",
  '',
  "import { Codex } from '@openai/codex-sdk';",
  "import Ajv from 'ajv';",
].join('\n');

const GLOBALS = [
  'const { agent, parallel, pipeline, phase, log, workflow, budget } = createWorkflowRuntime(CONFIG, {',
  '  Codex,',
  '  Ajv,',
  '  childProcess,',
  '  fs,',
  '  os,',
  '  path,',
  '});',
].join('\n');

const ENTRY = [
  '// Read `args` from the first command-line argument, run the workflow, and print its result.',
  'let workflowArgs;',
  'try {',
  '  workflowArgs = process.argv[2] === undefined ? undefined : JSON.parse(process.argv[2]);',
  '} catch (error) {',
  '  process.stderr.write(',
  '    `The first argument must be JSON, such as \'{"base":"main"}\' or \'"main"\': ${error.message}\\n`,',
  '  );',
  '  process.exit(1);',
  '}',
  '',
  'try {',
  '  const result = await workflowBody(workflowArgs);',
  '  process.stdout.write(`${JSON.stringify(result ?? null, null, 2)}\\n`, () => process.exit(0));',
  '} catch (error) {',
  '  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);',
  '  process.stderr.write(`${message}\\n`, () => process.exit(1));',
  '}',
].join('\n');

/**
 * Convert a Claude Code workflow script to a Codex SDK script. Fails when the
 * script doesn't parse, its `meta` is invalid, or its body can't be wrapped in
 * a function (a static `import`, say).
 */
export const generateCodexWorkflow = (
  source: string,
  options: CodexExportOptions,
): CodexExportResult => {
  const metaResult = parseClaudeWorkflowMeta(source);
  if (!metaResult.ok)
    return {
      ok: false,
      error: metaResult.line ? `Line ${metaResult.line}: ${metaResult.error}` : metaResult.error,
    };
  const calls = extractClaudeWorkflowCalls(source);
  if (!calls.ok)
    return { ok: false, error: calls.line ? `Line ${calls.line}: ${calls.error}` : calls.error };

  const { meta, scriptBody } = metaResult;
  const program = parse(source, {
    ...parseOptions,
    allowAwaitOutsideFunction: true,
    allowReturnOutsideFunction: true,
  }) as unknown as AstNode;

  const fileName = `${safeFileStem(meta.name)}.codex.mjs`;
  const notes = buildNotes({
    meta,
    calls,
    agentCalls: findAgentCalls(program),
    options,
    fileName,
    argsLine: firstReference(program, 'args'),
    budgetLine: firstReference(program, 'budget'),
  });

  const bodyOffset = source.length - scriptBody.length;
  const metaText = source.slice(0, bodyOffset).trimEnd();
  const body = scriptBody.trimEnd();
  const beforeBody = [
    header(meta, fileName, notes),
    IMPORTS,
    configSection(options, modelsFrom(calls).models),
    '// ---- Claude Code’s workflow globals, rebuilt on the Codex SDK ----',
    runtimeSource.trim(),
    GLOBALS,
    '// ---- The workflow, as written for Claude Code ----',
    metaText,
    'async function workflowBody(args) {',
  ].join('\n\n');
  const text = `${beforeBody}\n${body}\n}\n\n${ENTRY}\n`;

  // The body runs inside a function now, so check that it still parses there.
  try {
    parse(text, parseOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/\s*\(\d+:\d+\)$/, '') : '';
    const loc: unknown = error instanceof SyntaxError ? Reflect.get(error, 'loc') : undefined;
    const generatedLine =
      isPlainObject(loc) && typeof loc['line'] === 'number' ? loc['line'] : undefined;
    const firstBodyLine = lineAt(text, beforeBody.length) + 1;
    const sourceLine =
      generatedLine === undefined || generatedLine < firstBodyLine
        ? undefined
        : generatedLine - firstBodyLine + lineAt(source, bodyOffset);
    return {
      ok: false,
      error: `The script body can’t run inside a function${sourceLine ? ` (line ${sourceLine})` : ''}: ${message}`,
    };
  }

  return { ok: true, fileName, text, notes };
};
