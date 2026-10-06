import { describe, expect, it } from 'vitest';

import {
  categoriesOf,
  classify,
  defaultRules,
  isFloorCategory,
  parseRules,
  serializeRules,
  UNCLASSIFIED,
} from './rules';

const categoryOf = (text: string): string => classify([text], defaultRules).category;

describe('classify with the default rules', () => {
  it.each([
    ['zsh: command not found: timeout', 'floor: missing tool'],
    ["'jq' is not recognized as an internal or external command", 'floor: missing tool'],
    ['zsh: no matches found: src/routes/[slug]', 'floor: shell option'],
    ["ModuleNotFoundError: No module named 'yaml'", 'floor: environment'],
    ["error TS2688: Cannot find type definition file for 'bun-types'.", 'floor: environment'],
    ['unknown flag: --merged-by', 'floor: CLI mismatch'],
    ["argument command: invalid choice: 'lst'", 'floor: CLI mismatch'],
    ['cat: config.json: No such file or directory', 'floor or task (ask)'],
    ['zsh: permission denied: ./deploy.sh', 'floor: permissions'],
    ['<tool_use_error>File has not been read yet.</tool_use_error>', 'harness'],
    ['AssertionError: expected 90 to be 81', UNCLASSIFIED],
  ])('puts %s in %s', (text, category) => {
    expect(categoryOf(text)).toBe(category);
  });

  it('ignores case', () => {
    expect(categoryOf('ZSH: COMMAND NOT FOUND: TIMEOUT')).toBe('floor: missing tool');
  });

  it('applies rules in order, so the first match wins', () => {
    // Both rules match; the missing-tool rule comes first.
    expect(categoryOf('<tool_use_error>command not found</tool_use_error>')).toBe(
      'floor: missing tool',
    );

    const reordered = [defaultRules[6], ...defaultRules.slice(0, 6)];
    expect(
      classify(['<tool_use_error>command not found</tool_use_error>'], reordered).category,
    ).toBe('harness');
  });

  it('follows an edited category and skips a rule with none', () => {
    const edited = defaultRules.map((rule) =>
      rule.id === 'missing-file' ? { ...rule, category: 'task: wrong path' } : rule,
    );
    expect(classify(['ENOENT: open config.json'], edited).category).toBe('task: wrong path');

    const blank = defaultRules.map((rule) => ({ ...rule, category: ' ' }));
    expect(classify(['command not found'], blank)).toEqual({
      category: UNCLASSIFIED,
      ruleId: null,
    });
  });
});

describe('isFloorCategory', () => {
  it('counts only the floor categories, not the ones that could be either', () => {
    expect(isFloorCategory('floor: missing tool')).toBe(true);
    expect(isFloorCategory('Floor: custom')).toBe(true);
    expect(isFloorCategory('floor or task (ask)')).toBe(false);
    expect(isFloorCategory('harness')).toBe(false);
  });
});

describe('categoriesOf', () => {
  it('lists each category once, in rule order, with unclassified last', () => {
    expect(categoriesOf(defaultRules)).toEqual([
      'floor: missing tool',
      'floor: shell option',
      'floor: environment',
      'floor: CLI mismatch',
      'floor or task (ask)',
      'floor: permissions',
      'harness',
      UNCLASSIFIED,
    ]);
  });
});

describe('parseRules', () => {
  it('reads back what serializeRules writes', () => {
    const parsed = parseRules(serializeRules(defaultRules));

    expect('rules' in parsed && parsed.rules.map((rule) => rule.pattern)).toEqual(
      defaultRules.map((rule) => rule.pattern),
    );
  });

  it('explains what’s wrong with a bad table', () => {
    expect(parseRules('nope')).toEqual({ error: 'That file isn’t valid JSON.' });
    expect(parseRules('{"rules":[{"pattern":"x"}]}')).toEqual({
      error: 'Rule 1 needs a pattern and a category.',
    });
  });
});
