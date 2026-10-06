import { splitToolList } from '$lib/experiments/tool-rules/tool-rules';

import { isEmptyValue, isMapping } from './skill-document';
import type { DraftKey, SkillDocument, SkillOptions, Target } from './skill-document';

/**
 * Every option the editor offers, in the order an export writes new keys. A
 * field is a view over the document: `read*` turns the stored value into what
 * the control shows, and `writeField` stores an edit, leaving the original
 * value alone when the edit doesn't change what it means.
 */

export type GroupId =
  | 'essentials'
  | 'tools'
  | 'invocation'
  | 'fork'
  | 'model'
  | 'environment'
  | 'standard'
  | 'interface'
  | 'policy';

/** How a list stored as one string splits into items. */
export type ListSplit = 'tools' | 'words' | 'commas';

type HintContext = { target: Target; skill: SkillDocument };

export type FieldDefinition = {
  /** The key path, joined with dots: `name`, `metadata.short-description`, `interface.display_name`. */
  key: string;
  /** Which file holds it. */
  file: 'skill' | 'openai';
  label: string;
  hint: string | ((context: HintContext) => string);
  /**
   * The control. `tools` is a tool list with its own editor for Claude Code
   * (see `toolRole`) and a plain list for Codex, which doesn't read it;
   * `dependencies` is the rows of `agents/openai.yaml`'s `dependencies.tools`.
   */
  kind: 'text' | 'list' | 'boolean' | 'select' | 'draft' | 'tools' | 'dependencies';
  /** For a `tools` field: what its rules mean in Claude Code. */
  toolRole?: 'pre-approve' | 'remove';
  /** Where the field shows for each target. A target without an entry doesn't show it. */
  groups: Partial<Record<Target, GroupId>>;
  limit?: number;
  rows?: number;
  placeholder?: string;
  monospace?: boolean;
  suggestions?: readonly string[] | 'effort' | 'products';
  options?: 'context' | 'shell';
  split?: ListSplit;
  /** Write whole numbers as numbers, as `effort` needs. */
  integer?: boolean;
  /** What leaving a boolean or choice unset means. */
  unsetLabel?: string;
  draft?: DraftKey;
};

export const groups: Record<
  GroupId,
  {
    title: string;
    description?: string | ((target: Target) => string);
    /** Open when the page loads. */
    open?: boolean;
  }
> = {
  essentials: { title: 'Essentials' },
  tools: {
    title: 'Tools',
    open: true,
    description: (target) =>
      target === 'codex'
        ? 'Codex reads only `name`, `description`, and `metadata.short-description` from `SKILL.md`, so `allowed-tools` has no effect there; the editor still writes it for other tools. What Codex does read is the list of tools the skill depends on, in `agents/openai.yaml`.'
        : 'Two different settings: what runs without asking while the skill is invoked, and what the skill takes away while it runs.',
  },
  invocation: {
    title: 'Invocation and arguments',
    description: 'Who can run the skill and what it takes after its name.',
  },
  fork: {
    title: 'Run in a subagent',
    description: 'Run the body as the task for a fresh subagent instead of in your conversation.',
  },
  model: { title: 'Model and effort' },
  environment: { title: 'Hooks, paths, and shell' },
  standard: {
    title: 'Open standard fields',
    description: (target) =>
      target === 'codex'
        ? 'Fields from the agentskills.io standard. Codex reads only `name`, `description`, and `metadata.short-description`; these are written so other tools can read them.'
        : 'Fields from the agentskills.io standard, which other tools that read skills share.',
  },
  interface: {
    title: 'Interface',
    description: 'Written to `agents/openai.yaml` beside `SKILL.md`.',
  },
  policy: {
    title: 'Policy',
    description: 'Written to `agents/openai.yaml` beside `SKILL.md`.',
  },
};

export const groupOrder: Record<Target, GroupId[]> = {
  claude: ['essentials', 'tools', 'invocation', 'fork', 'model', 'environment', 'standard'],
  codex: ['essentials', 'tools', 'interface', 'policy', 'standard'],
};

const LISTING_LIMIT = 1536;

const listingLength = (skill: SkillDocument): number =>
  readText(skill.frontmatter.description).length + readText(skill.frontmatter.when_to_use).length;

export const fields: readonly FieldDefinition[] = [
  {
    key: 'name',
    file: 'skill',
    label: 'Name',
    kind: 'text',
    monospace: true,
    placeholder: 'release-notes',
    groups: { claude: 'essentials', codex: 'essentials' },
    hint: ({ target }) =>
      target === 'codex'
        ? 'Required. Lowercase letters, numbers, and single hyphens, up to 64 characters, matching the folder name.'
        : 'Lowercase letters, numbers, and single hyphens, up to 64 characters. You run the skill as `/name`. Leave it blank and Claude Code uses the folder name.',
  },
  {
    key: 'description',
    file: 'skill',
    label: 'Description',
    kind: 'text',
    rows: 4,
    limit: 1024,
    groups: { claude: 'essentials', codex: 'essentials' },
    hint: ({ target }) =>
      `${target === 'codex' ? 'Required. ' : ''}What the skill does and when to use it, in the third person. The agent reads this to decide whether to load the skill.`,
  },
  {
    key: 'when_to_use',
    file: 'skill',
    label: 'When to use it',
    kind: 'text',
    rows: 3,
    groups: { claude: 'essentials' },
    hint: ({ skill }) =>
      `More on when the skill applies. Claude Code lists it with \`description\` and truncates the two past ${LISTING_LIMIT.toLocaleString('en-US')} characters; together they're at ${listingLength(skill).toLocaleString('en-US')}.`,
  },
  {
    key: 'argument-hint',
    file: 'skill',
    label: 'Argument hint',
    kind: 'text',
    monospace: true,
    placeholder: '[version]',
    groups: { claude: 'invocation' },
    hint: 'The placeholder autocomplete shows after the skill’s name, such as `[version]`.',
  },
  {
    key: 'arguments',
    file: 'skill',
    label: 'Arguments',
    kind: 'list',
    split: 'words',
    placeholder: 'version',
    groups: { claude: 'invocation', codex: 'standard' },
    hint: ({ target }) =>
      target === 'codex'
        ? 'Named inputs. Codex doesn’t read this.'
        : 'Names the inputs. In the body, `$ARGUMENTS` is everything typed after the name, `$0` and `$1` are positional, and `$name` is a named input.',
  },
  {
    key: 'disable-model-invocation',
    file: 'skill',
    label: 'Only run when invoked',
    kind: 'boolean',
    unsetLabel: 'Not set (you and the agent can both run it)',
    groups: { claude: 'essentials' },
    hint: '`true` means the skill runs only when you type its slash command; the agent never loads it on its own. Use it for anything with side effects, like a release.',
  },
  {
    key: 'user-invocable',
    file: 'skill',
    label: 'Show as a slash command',
    kind: 'boolean',
    unsetLabel: 'Not set (you can run it)',
    groups: { claude: 'invocation' },
    hint: '`false` hides the skill from your slash-command menu, so only the agent loads it. Useful for background knowledge.',
  },
  {
    key: 'allowed-tools',
    file: 'skill',
    label: 'Pre-approved tools',
    kind: 'tools',
    toolRole: 'pre-approve',
    split: 'tools',
    placeholder: 'Read',
    groups: { claude: 'tools', codex: 'tools' },
    hint: ({ target }) =>
      target === 'codex'
        ? 'Kept in `SKILL.md` for tools that read the open standard. Codex ignores it.'
        : 'Rules listed here don’t prompt during the turn that invokes the skill; they only grant, never restrict, and can’t override a deny rule.',
  },
  {
    key: 'disallowed-tools',
    file: 'skill',
    label: 'Removed tools',
    kind: 'tools',
    toolRole: 'remove',
    split: 'tools',
    groups: { claude: 'tools' },
    hint: 'Checked tools stay available while the skill runs. Uncheck one to take it away; pair it with a deny rule in settings if it must never run.',
  },
  {
    key: 'model',
    file: 'skill',
    label: 'Model',
    kind: 'text',
    monospace: true,
    placeholder: 'sonnet',
    suggestions: ['sonnet', 'opus', 'haiku'],
    groups: { claude: 'model' },
    hint: 'Overrides the model while the skill runs: the fork’s with `context: fork`, your conversation’s without it.',
  },
  {
    key: 'effort',
    file: 'skill',
    label: 'Effort',
    kind: 'text',
    monospace: true,
    integer: true,
    placeholder: 'high',
    suggestions: 'effort',
    groups: { claude: 'model' },
    hint: 'Overrides reasoning effort while the skill runs: a level such as `high`, or a whole-number budget.',
  },
  {
    key: 'context',
    file: 'skill',
    label: 'Context',
    kind: 'select',
    options: 'context',
    unsetLabel: 'Not set (runs in your conversation)',
    groups: { claude: 'fork' },
    hint: '`fork` makes the body the task for a new subagent with its own empty context. The fork doesn’t see your conversation, so the body has to be a task that stands on its own.',
  },
  {
    key: 'agent',
    file: 'skill',
    label: 'Agent type',
    kind: 'text',
    monospace: true,
    placeholder: 'Explore',
    suggestions: ['Explore', 'Plan', 'general-purpose'],
    groups: { claude: 'fork' },
    hint: 'The agent type the fork runs as, with its prompt, tools, and model, such as `Explore` or one of your own. Only applies with `context: fork`; without it the fork is `general-purpose` with every tool.',
  },
  {
    key: 'background',
    file: 'skill',
    label: 'Run in the background',
    kind: 'boolean',
    unsetLabel: 'Not set',
    groups: { claude: 'fork' },
    hint: 'Whether a fork runs in the background. Forks do by default since Claude Code 2.1.218, and a background fork’s edits land outside `/rewind` checkpoints.',
  },
  {
    key: 'hooks',
    file: 'skill',
    label: 'Hooks',
    kind: 'draft',
    draft: 'hooks',
    rows: 6,
    monospace: true,
    placeholder:
      'PostToolUse:\n  - matcher: Edit\n    hooks:\n      - type: command\n        command: bun run lint',
    groups: { claude: 'environment' },
    hint: 'Hooks registered when the skill is invoked, as YAML. They stay registered for the session unless an entry sets `once: true`.',
  },
  {
    key: 'paths',
    file: 'skill',
    label: 'Paths',
    kind: 'list',
    split: 'commas',
    placeholder: 'src/**/*.ts',
    groups: { claude: 'environment' },
    hint: 'File glob patterns, such as `src/**/*.ts`.',
  },
  {
    key: 'shell',
    file: 'skill',
    label: 'Shell',
    kind: 'select',
    options: 'shell',
    groups: { claude: 'environment' },
    hint: '`bash` or `powershell`.',
  },
  {
    key: 'license',
    file: 'skill',
    label: 'License',
    kind: 'text',
    placeholder: 'MIT',
    groups: { claude: 'standard', codex: 'standard' },
    hint: 'A license name, or a reference to a license file in the folder.',
  },
  {
    key: 'compatibility',
    file: 'skill',
    label: 'Compatibility',
    kind: 'text',
    rows: 2,
    limit: 500,
    groups: { claude: 'standard', codex: 'standard' },
    hint: 'Environment requirements the body assumes.',
  },
  {
    key: 'metadata.short-description',
    file: 'skill',
    label: 'Short description',
    kind: 'text',
    groups: { claude: 'standard', codex: 'essentials' },
    hint: ({ target }) =>
      target === 'codex'
        ? 'A shorter description, kept in `SKILL.md`’s `metadata`. Codex reads it along with `name` and `description`.'
        : 'A shorter description, kept in `metadata`. Claude Code doesn’t read it; Codex does.',
  },
  {
    key: 'metadata',
    file: 'skill',
    label: 'Metadata',
    kind: 'draft',
    draft: 'metadata',
    rows: 3,
    monospace: true,
    placeholder: 'version: "1.0"\nauthor: you',
    groups: { claude: 'standard', codex: 'standard' },
    hint: 'Other `key: value` pairs, as YAML. The standard maps strings to strings, and nothing checks them. The short description has its own field.',
  },
  {
    key: 'interface.display_name',
    file: 'openai',
    label: 'Display name',
    kind: 'text',
    placeholder: 'Release notes',
    groups: { codex: 'interface' },
    hint: 'A user-facing name for the skill.',
  },
  {
    key: 'interface.short_description',
    file: 'openai',
    label: 'Interface description',
    kind: 'text',
    groups: { codex: 'interface' },
    hint: 'A user-facing description, separate from the one in `SKILL.md`.',
  },
  {
    key: 'interface.icon_small',
    file: 'openai',
    label: 'Small icon',
    kind: 'text',
    monospace: true,
    placeholder: './assets/icon-small.png',
    groups: { codex: 'interface' },
    hint: 'The small icon.',
  },
  {
    key: 'interface.icon_large',
    file: 'openai',
    label: 'Large icon',
    kind: 'text',
    monospace: true,
    placeholder: './assets/icon-large.png',
    groups: { codex: 'interface' },
    hint: 'The large icon.',
  },
  {
    key: 'interface.brand_color',
    file: 'openai',
    label: 'Brand color',
    kind: 'text',
    monospace: true,
    placeholder: '#2563EB',
    groups: { codex: 'interface' },
    hint: 'A brand color for the skill.',
  },
  {
    key: 'interface.default_prompt',
    file: 'openai',
    label: 'Default prompt',
    kind: 'text',
    rows: 2,
    groups: { codex: 'interface' },
    hint: 'A prompt to start from when using the skill.',
  },
  {
    key: 'policy.allow_implicit_invocation',
    file: 'openai',
    label: 'Let Codex choose it',
    kind: 'boolean',
    unsetLabel: 'Not set',
    groups: { codex: 'essentials' },
    hint: '`false` means Codex uses the skill only when you ask for it, the equivalent of Claude Code’s `disable-model-invocation: true`. Written to `agents/openai.yaml`.',
  },
  {
    key: 'policy.products',
    file: 'openai',
    label: 'Products',
    kind: 'list',
    split: 'commas',
    suggestions: 'products',
    placeholder: 'codex',
    groups: { codex: 'policy' },
    hint: 'Which products the skill is for.',
  },
  {
    key: 'dependencies.tools',
    file: 'openai',
    label: 'Tool dependencies',
    kind: 'dependencies',
    groups: { codex: 'tools' },
    hint: 'Tools the skill depends on, such as an MCP server, written to `agents/openai.yaml`. Each entry needs a `type` and a `value`.',
  },
];

/**
 * Schema keys with no field of their own, and why. The coverage test fails on
 * any schema key that's in neither `fields` nor here.
 */
export const omitted: Record<string, string> = {
  disallowedTools:
    'An undocumented alias Claude Code accepts for disallowed-tools. Loading a file folds it into disallowed-tools.',
};

/** The top-level frontmatter keys in field order, which is the order new keys are written in. */
export const skillKeyOrder: string[] = [
  ...new Set(
    fields.filter((field) => field.file === 'skill').map((field) => field.key.split('.')[0] ?? ''),
  ),
];

export const fieldPath = (field: FieldDefinition): string[] => field.key.split('.');

/** A DOM id for a field's control. */
export const fieldId = (field: FieldDefinition): string =>
  `skill-${field.key.replace(/[^a-z0-9_-]/gi, '-')}`;

export const fieldHint = (field: FieldDefinition, context: HintContext): string =>
  typeof field.hint === 'function' ? field.hint(context) : field.hint;

export const fieldsFor = (target: Target, group: GroupId): FieldDefinition[] =>
  fields.filter((field) => field.groups[target] === group);

export const suggestionsFor = (field: FieldDefinition, options: SkillOptions): readonly string[] =>
  field.suggestions === 'effort'
    ? options.effort
    : field.suggestions === 'products'
      ? options.products
      : (field.suggestions ?? []);

export const getIn = (value: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((current, key) => (isMapping(current) ? current[key] : undefined), value);

/**
 * Sets a nested value and returns a new mapping. An existing key keeps its
 * place; an empty value removes the key, and any mapping that leaves empty.
 */
export const setIn = (
  mapping: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): Record<string, unknown> => {
  const [key, ...rest] = path;
  if (key === undefined) return mapping;

  const current = mapping[key];
  const next = rest.length === 0 ? value : setIn(isMapping(current) ? current : {}, rest, value);

  if (isEmptyValue(next)) {
    return Object.fromEntries(Object.entries(mapping).filter(([existing]) => existing !== key));
  }

  return { ...mapping, [key]: next };
};

export const rawValue = (skill: SkillDocument, field: FieldDefinition): unknown =>
  getIn(field.file === 'skill' ? skill.frontmatter : skill.openai, fieldPath(field));

export const readText = (raw: unknown): string => {
  if (typeof raw === 'string') return raw;
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'object') return JSON.stringify(raw);

  return String(raw);
};

const TRUE_SPELLINGS = new Set(['1', 'true', 'yes', 'on']);
const FALSE_SPELLINGS = new Set(['0', 'false', 'no', 'off']);

/**
 * A boolean as the select shows it: `true`, `false`, or blank for unset.
 * Claude Code also reads yes/on/1 and no/off/0, so those show as true and
 * false; anything else shows as itself so the schema can flag it.
 */
export const readBoolean = (raw: unknown): string => {
  if (typeof raw === 'boolean') return String(raw);
  if (raw === undefined || raw === null) return '';

  const spelling = String(raw).trim().toLowerCase();
  if (TRUE_SPELLINGS.has(spelling)) return 'true';
  if (FALSE_SPELLINGS.has(spelling)) return 'false';

  return readText(raw);
};

/**
 * Splits a list written as one string. Commas always separate; for tool
 * lists and argument names, spaces do too, except inside parentheses, so
 * `Bash(git diff:*)` stays one item.
 */
export const splitList = (text: string, split: ListSplit): string[] => {
  // Tool lists split exactly as Claude Code splits a skill's tool fields.
  if (split === 'tools') return splitToolList(text, 'commas-or-spaces');

  const items: string[] = [];
  let depth = 0;
  let current = '';

  for (const character of text) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);

    const separates = character === ',' || (split !== 'commas' && /\s/.test(character));
    if (separates && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  items.push(current);

  return items.map((item) => item.trim()).filter((item) => item.length > 0);
};

export const readList = (raw: unknown, split: ListSplit = 'commas'): string[] => {
  if (Array.isArray(raw)) return raw.map(readText);
  if (typeof raw === 'string') return splitList(raw, split);
  if (raw === undefined || raw === null) return [];

  return [readText(raw)];
};

const sameList = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((item, index) => item === second[index]);

/** The value to store for what a control shows, keeping the original when nothing changed. */
const toStoredValue = (
  field: FieldDefinition,
  display: string | string[],
  raw: unknown,
): unknown => {
  if (Array.isArray(display)) {
    if (sameList(display, readList(raw, field.split))) return raw;
    // A list written as one string stays one string, separated the way it was:
    // by spaces only when it had several items and no commas.
    if (typeof raw === 'string') {
      const spaced =
        field.split !== 'commas' && !raw.includes(',') && readList(raw, field.split).length > 1;

      return display.join(spaced ? ' ' : ', ');
    }

    return display;
  }

  if (field.kind === 'boolean') {
    if (display === readBoolean(raw)) return raw;
    if (display === 'true') return true;
    if (display === 'false') return false;

    return display === '' ? undefined : display;
  }

  if (field.integer && /^\d+$/.test(display.trim())) return Number(display.trim());

  return display === '' ? undefined : display;
};

export const writeField = (
  skill: SkillDocument,
  field: FieldDefinition,
  display: string | string[],
): SkillDocument => {
  const path = fieldPath(field);
  const value = toStoredValue(field, display, rawValue(skill, field));

  return field.file === 'skill'
    ? { ...skill, frontmatter: setIn(skill.frontmatter, path, value) }
    : { ...skill, openai: setIn(skill.openai, path, value) };
};

/**
 * Merges the metadata draft back into `metadata`, keeping the short
 * description, which has its own field, and the order of existing keys.
 */
export const mergeMetadata = (current: unknown, parsed: unknown): Record<string, unknown> => {
  const existing = isMapping(current) ? current : {};
  const edited = isMapping(parsed) ? parsed : {};
  const merged: Record<string, unknown> = {};

  for (const key of Object.keys(existing)) {
    if (key === 'short-description') merged[key] = existing[key];
    else if (key in edited) merged[key] = edited[key];
  }
  for (const key of Object.keys(edited)) {
    if (!(key in merged) && key !== 'short-description') merged[key] = edited[key];
  }

  return merged;
};

/** Stores a structured field's draft and, when it parsed, its value. */
export const applyDraft = (
  skill: SkillDocument,
  key: DraftKey,
  text: string,
  parsed: { ok: true; value: unknown } | { ok: false },
): SkillDocument => {
  const next: SkillDocument = { ...skill, drafts: { ...skill.drafts, [key]: text } };
  if (!parsed.ok) return next;

  const value =
    key === 'metadata' ? mergeMetadata(skill.frontmatter.metadata, parsed.value) : parsed.value;

  return { ...next, frontmatter: setIn(skill.frontmatter, [key], value) };
};

/** Whether a field holds a value, for the "2 set" count on a closed group. */
export const isFieldSet = (skill: SkillDocument, field: FieldDefinition): boolean =>
  !isEmptyValue(rawValue(skill, field));

/** The fields of one `dependencies.tools` entry the editor offers, in the order it writes them. */
export const dependencyKeys = [
  'type',
  'value',
  'description',
  'transport',
  'url',
  'command',
] as const;

export type DependencyKey = (typeof dependencyKeys)[number];

/** `agents/openai.yaml`'s `dependencies.tools`, as loaded. Anything not a list reads as none. */
export const readDependencies = (skill: SkillDocument): unknown[] => {
  const raw = getIn(skill.openai, ['dependencies', 'tools']);

  return Array.isArray(raw) ? raw : [];
};

/** Replaces the dependency list. An empty list removes `dependencies` entirely. */
export const writeDependencies = (skill: SkillDocument, entries: unknown[]): SkillDocument => ({
  ...skill,
  openai: setIn(skill.openai, ['dependencies', 'tools'], entries),
});

/**
 * Sets one key of one entry, keeping the entry's other keys (such as `oauth`)
 * and its key order. A blank optional key is removed; a blank `type` or
 * `value` stays blank so the entry keeps its place while it's being filled in.
 */
export const setDependency = (
  skill: SkillDocument,
  index: number,
  key: DependencyKey,
  text: string,
): SkillDocument => {
  const entries = readDependencies(skill).map((entry, position) => {
    if (position !== index) return entry;

    const current = isMapping(entry) ? entry : {};
    if (text !== '' || key === 'type' || key === 'value') return { ...current, [key]: text };

    return Object.fromEntries(Object.entries(current).filter(([existing]) => existing !== key));
  });

  return writeDependencies(skill, entries);
};

export const addDependency = (skill: SkillDocument): SkillDocument =>
  writeDependencies(skill, [...readDependencies(skill), { type: '', value: '' }]);

export const removeDependency = (skill: SkillDocument, index: number): SkillDocument =>
  writeDependencies(
    skill,
    readDependencies(skill).filter((_, position) => position !== index),
  );
