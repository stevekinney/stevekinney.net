/**
 * The editable rule table that sorts error clusters into categories. Rules run
 * in order and the first match wins. A pattern is plain text, matched without
 * regard to case; one rule can list several patterns separated by `|`.
 */

export type Rule = {
  id: string;
  /** Plain-text patterns separated by `|`, such as `command not found | not recognized as an internal`. */
  pattern: string;
  category: string;
  why: string;
};

export const UNCLASSIFIED = 'unclassified';

/** A category that counts toward the floor share. `floor or task (ask)` doesn't: it could be either. */
export const isFloorCategory = (category: string): boolean =>
  category.trim().toLowerCase().startsWith('floor:');

export const defaultRules: readonly Rule[] = [
  {
    id: 'missing-tool',
    pattern: 'command not found | not recognized as an internal',
    category: 'floor: missing tool',
    why: 'A command the agent expected isn’t installed, such as `timeout` on macOS.',
  },
  {
    id: 'shell-option',
    pattern: 'no matches found',
    category: 'floor: shell option',
    why: 'zsh’s `nomatch` option aborts any command with a glob that matches nothing, such as a `[slug]` route.',
  },
  {
    id: 'environment',
    pattern: 'ModuleNotFoundError | Cannot find module | cannot find type definition',
    category: 'floor: environment',
    why: 'A dependency or its type definitions are missing from the environment.',
  },
  {
    id: 'cli-mismatch',
    pattern: 'unknown flag | unknown field | invalid choice | unrecognized option',
    category: 'floor: CLI mismatch',
    why: 'The agent guessed a flag or field that the installed CLI rejects.',
  },
  {
    id: 'missing-file',
    pattern: 'ENOENT | No such file or directory',
    category: 'floor or task (ask)',
    why: 'Could be a missing file in the environment or a wrong guess about the task. Look at the examples.',
  },
  {
    id: 'permissions',
    pattern: 'Permission denied | EACCES',
    category: 'floor: permissions',
    why: 'The process can’t read, write, or run something it needs.',
  },
  {
    id: 'harness',
    pattern: '<tool_use_error>',
    category: 'harness',
    why: 'The tool call itself was malformed or refused before anything ran.',
  },
];

export const toPatterns = (pattern: string): string[] =>
  pattern
    .split('|')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

export type Classification = { category: string; ruleId: string | null };

/** The first rule with a pattern in any of the texts, or `unclassified`. */
export const classify = (texts: readonly string[], rules: readonly Rule[]): Classification => {
  const haystacks = texts.map((text) => text.toLowerCase());

  for (const rule of rules) {
    const category = rule.category.trim();
    if (!category) continue;

    const patterns = toPatterns(rule.pattern);
    if (patterns.some((pattern) => haystacks.some((text) => text.includes(pattern)))) {
      return { category, ruleId: rule.id };
    }
  }

  return { category: UNCLASSIFIED, ruleId: null };
};

/** Every category the rules name, in rule order, with `unclassified` last. */
export const categoriesOf = (rules: readonly Rule[]): string[] => [
  ...new Set([...rules.map((rule) => rule.category.trim()).filter(Boolean), UNCLASSIFIED]),
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const MAXIMUM_RULES = 100;
const MAXIMUM_FIELD_LENGTH = 300;

export type ParsedRules = { rules: Rule[] } | { error: string };

/** Reads a rule table from JSON text: `{ "rules": [...] }` or the bare array. */
export const parseRules = (text: string): ParsedRules => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { error: 'That file isn’t valid JSON.' };
  }

  const entries = Array.isArray(value) ? value : isRecord(value) ? value.rules : null;
  if (!Array.isArray(entries)) return { error: 'Expected a "rules" list.' };
  if (entries.length > MAXIMUM_RULES) {
    return { error: `A rule table can hold up to ${MAXIMUM_RULES} rules.` };
  }

  const rules: Rule[] = [];
  for (const [index, entry] of entries.entries()) {
    const position = `Rule ${index + 1}`;
    if (!isRecord(entry)) return { error: `${position} isn’t an object.` };

    const fields = ['pattern', 'category', 'why'] as const;
    const read = fields.map((field) =>
      typeof entry[field] === 'string' ? (entry[field] as string).trim() : '',
    );
    const [pattern, category, why] = read;
    if (!pattern || !category) return { error: `${position} needs a pattern and a category.` };
    if (read.some((field) => field.length > MAXIMUM_FIELD_LENGTH)) {
      return { error: `${position} has a field over ${MAXIMUM_FIELD_LENGTH} characters.` };
    }

    rules.push({ id: `rule-${index + 1}`, pattern, category, why });
  }

  return { rules };
};

export const serializeRules = (rules: readonly Rule[]): string =>
  `${JSON.stringify({ rules: rules.map(({ pattern, category, why }) => ({ pattern, category, why })) }, null, 2)}\n`;
