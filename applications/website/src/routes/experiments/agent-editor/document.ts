import { readOnlyTools } from '$lib/experiments/tool-rules/claude-tools';

/**
 * The agent being edited, kept as one document whichever tool it's exported
 * for. This module has no heavy dependencies, so the page can import it up front;
 * parsing, writing, and validating files live in `workbench.ts`.
 */

export type Target = 'claude' | 'codex';

/**
 * The Codex release the agent-file behavior on this page was checked against.
 * Recheck the "no effect" settings when Codex changes how it loads agent files.
 */
export const codexCheckedVersion = '0.160';

export const targetLabels: Record<Target, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
};

/** A field whose value was copied from the other tool's matching field, not set by the person. */
export type LinkedField = 'claude.effort' | 'codex.model_reasoning_effort';

export type AgentDocument = {
  /** The file name without its extension. Null means it follows the name. */
  fileName: string | null;
  name: string;
  description: string;
  /** Claude Code's system prompt, and Codex's `developer_instructions`. */
  body: string;
  /** Written as `model` for both tools. */
  model: string;
  /** Every other Claude Code frontmatter key, as read from a file or set in the form. */
  claude: Record<string, unknown>;
  /** Every other key of the Codex agent file. */
  codex: Record<string, unknown>;
  derived: readonly LinkedField[];
};

/** Claude Code's subagent frontmatter keys, in the order a new file writes them. */
export const claudeKeyOrder = [
  'name',
  'description',
  'tools',
  'disallowedTools',
  'model',
  'permissionMode',
  'maxTurns',
  'skills',
  'mcpServers',
  'hooks',
  'memory',
  'background',
  'effort',
  'isolation',
  'color',
  'initialPrompt',
  'omitClaudeMd',
  'experimental',
  'observer',
  'observerMessage',
  'observeSubagents',
] as const;

/** The Codex agent keys skillset's `codexAgentSchema` knows. Any other `config.toml` key is kept as-is. */
export const codexKnownKeys = [
  'name',
  'description',
  'developer_instructions',
  'model',
  'model_reasoning_effort',
  'model_verbosity',
  'sandbox_mode',
  'nickname_candidates',
  'hooks',
  'mcp_servers',
  'skills',
  'tools',
] as const;

/** The keys held at the top of the document rather than in `claude` or `codex`. */
const sharedKeys: Record<Target, ReadonlySet<string>> = {
  claude: new Set(['name', 'description', 'model']),
  codex: new Set(['name', 'description', 'model', 'developer_instructions']),
};

export const isSharedKey = (target: Target, key: string): boolean => sharedKeys[target].has(key);

/** Claude Code's named effort levels. Each is also one of Codex's built-in reasoning levels. */
export const claudeEffortLevels = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

/** Claude Code's model aliases (Configuring Subagents lists them). */
export const claudeModelAliases = ['inherit', 'sonnet', 'opus', 'haiku', 'fable'] as const;

/** A mapping, including the null-prototype tables smol-toml parses. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Whether a value would be written at all: blanks, empty lists, and empty mappings aren't. */
export const hasValue = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0) &&
  !(isPlainObject(value) && Object.keys(value).length === 0);

/**
 * A tool list to write back in the form it was read: a comma-separated string
 * stays a string, and anything else, a new list included, is a YAML list. An
 * empty list removes the key.
 */
export const writeToolList = (previous: unknown, next: readonly string[]): unknown =>
  next.length === 0 ? undefined : typeof previous === 'string' ? next.join(', ') : [...next];

/** The file name the validators check and the export uses, without an extension. */
export const effectiveFileName = (document: AgentDocument): string =>
  document.fileName ?? document.name;

export const fileExtension: Record<Target, string> = { claude: '.md', codex: '.toml' };

/** Where each tool reads agent files from, per Configuring Subagents and skillset's schemas. */
export const installFolders: Record<Target, string> = {
  claude: '.claude/agents/',
  codex: '.codex/agents/',
};

export const exportFileName = (document: AgentDocument, target: Target): string =>
  `${effectiveFileName(document).trim() || 'agent'}${fileExtension[target]}`;

/**
 * A field's place in the document: `name`, `model`, and the other shared
 * fields by name, and each tool's own fields as `claude.<key>` or
 * `codex.<key>`. Nested Claude keys use a dotted path, as in
 * `claude.experimental.cacheTtl`.
 */
export type FieldPath = string;

export const fieldPath = (target: Target, key: string): FieldPath =>
  isSharedKey(target, key) ? (key === 'developer_instructions' ? 'body' : key) : `${target}.${key}`;

/** Reads one tool-specific value, following a dotted path into nested mappings. */
export const readValue = (document: AgentDocument, target: Target, key: string): unknown => {
  const [head = '', ...rest] = key.split('.');
  let value: unknown = document[target][head];

  for (const segment of rest) {
    value = isPlainObject(value) ? value[segment] : undefined;
  }

  return value;
};

const withoutKey = (record: Record<string, unknown>, key: string): Record<string, unknown> => {
  const next = { ...record };
  delete next[key];

  return next;
};

/**
 * Sets one tool-specific value. A blank value removes the key, and a nested
 * mapping left empty, such as `experimental` without `cacheTtl`, goes too.
 * Setting a field by hand stops it following the other tool's matching field.
 */
export const writeValue = (
  document: AgentDocument,
  target: Target,
  key: string,
  value: unknown,
): AgentDocument => {
  const [head = '', child] = key.split('.');
  const record = document[target];
  let next = hasValue(value) ? value : undefined;

  if (child !== undefined) {
    const parent = isPlainObject(record[head]) ? record[head] : {};
    next = next === undefined ? withoutKey(parent, child) : { ...parent, [child]: next };
  }

  return {
    ...document,
    [target]: hasValue(next) ? { ...record, [head]: next } : withoutKey(record, head),
    derived: document.derived.filter((field) => field !== `${target}.${key}`),
  };
};

/**
 * Brings the effort across when switching tools. Claude Code's named levels
 * are all Codex reasoning levels too, so they copy as they are; a Codex level
 * copies back only when Claude Code has it. A field the person set keeps its
 * own value; one that was copied follows the other tool again.
 */
export const switchTarget = (document: AgentDocument, to: Target): AgentDocument => {
  const [field, source]: [LinkedField, unknown] =
    to === 'codex'
      ? ['codex.model_reasoning_effort', document.claude['effort']]
      : ['claude.effort', document.codex['model_reasoning_effort']];
  const key = field.slice(field.indexOf('.') + 1);
  const current = document[to][key];
  const wasDerived = document.derived.includes(field);

  if (hasValue(current) && !wasDerived) return document;

  const portable =
    typeof source === 'string' &&
    source.length > 0 &&
    (to === 'codex' || (claudeEffortLevels as readonly string[]).includes(source));

  if (!portable) {
    return wasDerived
      ? {
          ...document,
          [to]: withoutKey(document[to], key),
          derived: document.derived.filter((linked) => linked !== field),
        }
      : document;
  }

  return {
    ...document,
    [to]: { ...document[to], [key]: source },
    derived: [...document.derived.filter((linked) => linked !== field), field],
  };
};

/**
 * The other tool's settings that the current export leaves out, such as a
 * Claude Code `tools` list when exporting for Codex. They stay in the
 * document, so switching back brings them back.
 */
export const notWrittenFor = (document: AgentDocument, target: Target): string[] => {
  const other: Target = target === 'claude' ? 'codex' : 'claude';
  const carried =
    target === 'codex'
      ? document.codex['model_reasoning_effort'] === document.claude['effort']
        ? 'effort'
        : null
      : document.claude['effort'] === document.codex['model_reasoning_effort']
        ? 'model_reasoning_effort'
        : null;

  return Object.entries(document[other])
    .filter(([key, value]) => hasValue(value) && key !== carried)
    .map(([key]) => key);
};

/** Keys the current tool doesn't define, which the export writes back unchanged. */
export const keptAsIs = (document: AgentDocument, target: Target): string[] => {
  const known: readonly string[] = target === 'claude' ? claudeKeyOrder : codexKnownKeys;

  return Object.keys(document[target]).filter((key) => !known.includes(key));
};

/** The frontmatter values to write for Claude Code, known keys first in a fixed order. */
export const claudeValues = (document: AgentDocument): Record<string, unknown> => {
  const values: Record<string, unknown> = {};

  for (const key of claudeKeyOrder) {
    if (key === 'name') values[key] = document.name;
    else if (key === 'description') values[key] = document.description;
    else if (key === 'model') values[key] = document.model;
    else if (key in document.claude) values[key] = document.claude[key];
  }

  for (const [key, value] of Object.entries(document.claude)) {
    if (!(key in values)) values[key] = value;
  }

  return Object.fromEntries(Object.entries(values).filter(([, value]) => hasValue(value)));
};

/** The table to write for Codex. `name`, `description`, and the instructions are always written. */
export const codexValues = (document: AgentDocument): Record<string, unknown> => {
  const values: Record<string, unknown> = {
    name: document.name,
    description: document.description,
  };
  if (hasValue(document.model)) values['model'] = document.model;

  // A loaded file's own values stay as they were, an empty table included.
  for (const [key, value] of Object.entries(document.codex)) {
    if (value !== undefined && value !== null) values[key] = value;
  }
  values['developer_instructions'] = document.body;

  return values;
};

export const blankDocument = (): AgentDocument => ({
  fileName: null,
  name: '',
  description: '',
  body: '',
  model: '',
  claude: {},
  codex: {},
  derived: [],
});

const sampleBody = `You review code changes. You don't fix them.

## What to review

Read the diff you're given, then the files it touches and their nearest tests. Look for:

- Logic errors, unhandled edge cases, and broken error handling.
- Changed behavior that no test would catch if it regressed.
- Untrusted input that reaches a shell command, a query, a file path, or HTML.

Skip formatting and naming preferences unless they hide a bug.

## Rules

- Cite a file and line for every finding. If you can't point at the line, it isn't a finding.
- Don't edit files, and don't run anything that changes them.
- If the change is fine, say so. Never invent findings to fill the report.

## Report

Return only this, in Markdown:

**Verdict:** Approve, or Changes requested.

**Findings:** One bullet per finding, most severe first: \`path/to/file.ts:42\`, what's wrong, why it matters, and the smallest fix.

**Not checked:** Anything you couldn't verify, such as behavior that depends on code outside the diff.
`;

/** A read-only code reviewer that passes every check for both tools. */
export const sampleDocument = (): AgentDocument => ({
  fileName: null,
  name: 'code-reviewer',
  description:
    'Reviews a finished change for correctness bugs, missing tests, and unsafe input handling, and reports findings with file and line references. Use after a change is written and before it is committed. Not for style nits or for writing fixes.',
  body: sampleBody,
  model: 'sonnet',
  claude: { tools: [...readOnlyTools] },
  codex: {},
  derived: [],
});
