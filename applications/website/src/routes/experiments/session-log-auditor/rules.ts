/**
 * The rule table that sorts error clusters into categories. Rules run
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
