import { describe, expect, it } from 'vitest';

import {
  lintInstructions,
  MAXIMUM_CHECKED_CHARACTERS,
  notEnglishReason,
  splitInstructions,
} from './lint';
import { classificationLabels, defaultRules } from './lint-rules';

const sample = [
  '- Maintain high quality code.',
  '- Never read .env files.',
  '- Run `pnpm test:billing` from `apps/api` after billing changes.',
  '- Format files with Prettier after every edit.',
  '- Current branch is feature/invoices-2.',
].join('\n');

const lint = (text: string) => lintInstructions(text, defaultRules);

describe('acceptance 2: the sample CLAUDE.md', () => {
  const items = lint(sample);

  it('classifies the five lines in order', () => {
    expect(items.map((item) => item.primary)).toEqual([
      'vague',
      'must-hold',
      'good-fact',
      'deterministic',
      'stale-prone',
    ]);
    expect(items.map((item) => classificationLabels[item.primary].toLowerCase())).toEqual([
      'doesn’t change a decision',
      'must hold every time',
      'good operational fact',
      'deterministic',
      'stale-prone',
    ]);
  });

  it('suggests a permission deny with Read(**/.env*) for the .env line', () => {
    expect(items[1].suggestion).toContain('permission rule');
    expect(items[1].suggestion).toContain('deny `Read(**/.env*)`');
    expect(items[1].rung).toBe('permission');
  });

  it('suggests a formatter or hook for the formatting line', () => {
    expect(items[3].suggestion).toMatch(/formatter or a hook/);
    expect(items[3].rung).toBe('hook');
  });

  it('shows the rule that fired for every line', () => {
    expect(items[0].rule).toContain('“high quality”');
    expect(items[1].rule).toContain('“never”');
    expect(items[2].rule).toContain('“after”');
    expect(items[3].rule).toContain('(“format”) on every edit');
    expect(items[4].rule).toContain('feature/');
  });

  it('keeps line numbers from the file', () => {
    expect(items.map((item) => item.lineNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('edge cases', () => {
  it('returns nothing for an empty file', () => {
    expect(lint('')).toEqual([]);
  });

  it('returns nothing for a file of only headings and code blocks', () => {
    const text = [
      '# Project',
      '',
      '## Commands',
      '```sh',
      'never run rm -rf /',
      '```',
      '~~~',
      'Maintain high quality code.',
      '~~~',
      '<!-- a comment -->',
      '---',
      'Title',
      '=====',
    ].join('\n');

    expect(splitInstructions(text)).toEqual([]);
  });

  it('keeps a longer fence open across a shorter one inside it', () => {
    const text = [
      'Before.',
      '````md',
      'Run this:',
      '```sh',
      'never run rm -rf /',
      '```',
      'Maintain high quality code.',
      '````',
      'After.',
    ].join('\n');

    expect(splitInstructions(text).map((line) => line.text)).toEqual(['Before.', 'After.']);
  });

  it('closes a tilde fence only on tildes at least as long as the opening run', () => {
    const text = [
      'Before.',
      '~~~~',
      '~~~',
      'Maintain high quality code.',
      '````',
      'Never read .env files.',
      '~~~~~',
      'After.',
    ].join('\n');

    expect(splitInstructions(text).map((line) => line.text)).toEqual(['Before.', 'After.']);
  });

  it('does not close a fence on a line with text after the fence', () => {
    const text = ['```', '```sh', 'Maintain high quality code.', '```', 'After.'].join('\n');

    expect(splitInstructions(text).map((line) => line.text)).toEqual(['After.']);
  });

  it('skips a fenced example inside a blockquote, at any depth', () => {
    const text = [
      'Before.',
      '> ```sh',
      '> never run rm -rf /',
      '> ```',
      '> Quoted.',
      '> > ~~~',
      '> >Maintain high quality code.',
      '>> ~~~',
      'After.',
    ].join('\n');

    expect(splitInstructions(text).map((line) => line.text)).toEqual([
      'Before.',
      'Quoted.',
      'After.',
    ]);
    expect(lint(text).map((item) => item.text)).toEqual(['Before.', 'Quoted.', 'After.']);
  });

  it('closes a fence opened inside a blockquote when the blockquote ends', () => {
    // CommonMark: leaving the blockquote closes a fenced block that never closed inside it.
    const text = [
      'Before.',
      '> ```sh',
      '> never run rm -rf /',
      'Never read .env files.',
      '> > ~~~',
      '> > quoted example',
      '> Back to one level.',
      '> ```',
      '> still code',
      '',
      'After.',
    ].join('\n');

    expect(splitInstructions(text).map((line) => line.text)).toEqual([
      'Before.',
      'Never read .env files.',
      'Back to one level.',
      'After.',
    ]);
    expect(lint(text).find((item) => item.text === 'Never read .env files.')?.primary).toBe(
      'must-hold',
    );
  });

  it('skips front matter and indented code', () => {
    const text = ['---', 'name: x', '---', 'Intro.', '', '    never read .env', 'After.'].join(
      '\n',
    );

    expect(splitInstructions(text).map((line) => line.text)).toEqual(['Intro.', 'After.']);
  });

  it('checks only the start of a very long line and says so', () => {
    const long = `Never read .env files. ${'x'.repeat(MAXIMUM_CHECKED_CHARACTERS * 30)}`;
    const [item] = lint(long);

    expect(item.primary).toBe('must-hold');
    expect(item.truncated).toBe(true);
    expect(item.text).toHaveLength(long.length);
  });

  it('handles a long run of hex digits without hanging', () => {
    const started = performance.now();
    lint('f1'.repeat(50_000));

    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('classifies non-English text as unknown rather than guessing', () => {
    const items = lint(
      [
        '- Nunca leas los archivos .env.',
        '- Führe nach jeder Änderung `pnpm test` aus.',
        '- .envファイルは絶対に読まないでください。',
      ].join('\n'),
    );

    expect(items.map((item) => item.primary)).toEqual(['unknown', 'unknown', 'unknown']);
    expect(items[0].matches).toEqual([]);
    expect(notEnglishReason('Never read .env files.')).toBeNull();
  });

  it('takes the strongest match as primary and lists the others as secondary', () => {
    const [item] = lint('- Never edit files on feature/billing-cleanup before 2026-10-04.');

    expect(item.primary).toBe('must-hold');
    expect(item.matches.map((match) => match.classification)).toEqual([
      'must-hold',
      'stale-prone',
      'good-fact',
    ]);
  });

  it('orders every rule from strongest to weakest', () => {
    const [item] = lint(
      '- Never run prettier after every edit on feature/x; see the docs, it is good, when `x` changes.',
    );

    expect(item.matches.map((match) => match.classification)).toEqual([
      'must-hold',
      'deterministic',
      'stale-prone',
      'pointer',
      'good-fact',
    ]);
  });

  it('marks a line no rule matches', () => {
    const [item] = lint('Be kind to reviewers.');

    expect(item.primary).toBe('no-match');
    expect(item.rule).toBe('None of the rules matched this line.');
  });
});

describe('must-hold rules', () => {
  it.each([
    ['Never push to main.', 'ci', 'required CI check'],
    ['Do not touch the production database.', 'sandbox', 'credentials boundary'],
    ['Never run `rm -rf`.', 'permission', 'permission deny rule'],
    ['You must not edit `src/generated/`.', 'permission', 'permission deny rule'],
  ])('“%s” needs the %s rung', (text, rung, suggestion) => {
    const [item] = lint(text);

    expect(item.primary).toBe('must-hold');
    expect(item.rung).toBe(rung);
    expect(item.suggestion).toContain(suggestion);
  });

  it('leaves absolute language about something that isn’t tool-shaped alone', () => {
    expect(lint('Never be rude in commit messages')[0].primary).not.toBe('vague');
    expect(lint('Never give up.')[0].primary).toBe('no-match');
  });
});

describe('the other rules', () => {
  it('finds stale facts', () => {
    expect(lint('Working on COR-393 this week.')[0].rule).toContain('COR-393');
    expect(lint('Pinned to commit 3f9a2b1c.')[0].rule).toContain('3f9a2b1c');
    expect(lint('Freeze starts 2026-10-04.')[0].primary).toBe('stale-prone');
    expect(lint('Files are UTF-8 encoded.')[0].primary).not.toBe('stale-prone');
  });

  it('keeps a pointer that says when to read it and questions one that doesn’t', () => {
    const [timed] = lint('Before editing billing code, read `docs/billing-invariants.md`.');
    const [untimed] = lint('See docs/architecture.md for more.');

    expect(timed.primary).toBe('pointer');
    expect(timed.suggestion).toBe('It says when to read it, so keep it.');
    expect(untimed.primary).toBe('pointer');
    expect(untimed.suggestion).toMatch(/only if it says when/);
  });

  it('doesn’t call a vague word vague when there’s a checkable condition', () => {
    expect(lint('Keep functions clean and under 40 lines.')[0].primary).toBe('no-match');
  });

  it('finds a numbered procedure longer than five lines', () => {
    const steps = Array.from({ length: 6 }, (_, index) => `${index + 1}. Step ${index + 1}.`);
    const items = lint(steps.join('\n'));

    expect(items.every((item) => item.primary === 'skill-candidate')).toBe(true);
    expect(items[0].rule).toContain('6 numbered steps');
    expect(items[0].suggestion).toContain('one-line pointer');
  });

  it('leaves a five-step list alone', () => {
    const steps = Array.from({ length: 5 }, (_, index) => `${index + 1}. Step ${index + 1}.`);

    expect(lint(steps.join('\n')).some((item) => item.primary === 'skill-candidate')).toBe(false);
  });

  it('finds a procedure introduced with “to investigate” or under a how-to heading', () => {
    const bullets = Array.from({ length: 5 }, (_, index) => `- Check thing ${index + 1}.`);
    const introduced = lint(['To investigate a failed contract test:', ...bullets].join('\n'));
    const headed = lint(['## How to release', ...bullets, 'Then announce it.'].join('\n'));

    expect(introduced.map((item) => item.primary)).toEqual(Array(6).fill('skill-candidate'));
    expect(headed.map((item) => item.primary)).toEqual(Array(6).fill('skill-candidate'));
  });

  it('keeps two sections with the same how-to heading apart', () => {
    const section = ['## How to deploy', '- Build it.', '- Upload it.', '- Check it.'];
    const items = lint([...section, '', ...section].join('\n'));

    expect(items).toHaveLength(6);
    expect(items.some((item) => item.primary === 'skill-candidate')).toBe(false);

    // Text sections under repeated headings are counted apart too.
    const prose = ['## How to deploy', 'Build it.', 'Upload it.', 'Check it.'];
    expect(
      lint([...prose, ...prose].join('\n')).some((item) => item.primary === 'skill-candidate'),
    ).toBe(false);
  });

  it('follows the rules it is given', () => {
    const rules = structuredClone(defaultRules);
    rules.vague.enabled = false;
    rules.deterministic.tools = ['prettier', 'biome'];

    const items = lintInstructions(sample, rules);
    expect(items[0].primary).toBe('no-match');
    expect(items[3].primary).toBe('deterministic');
    expect(defaultRules.vague.enabled).toBe(true);
  });
});
