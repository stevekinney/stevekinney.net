import { describe, expect, it } from 'vitest';

import {
  applyReadout,
  assumedReservedOutput,
  normalizeLabel,
  parseReadout,
  scenarioFromReadout,
} from './readout-parser';

// The first table is real `claude -p "/context"` output from Claude Code 2.1.289.
// The later tables are synthetic stand-ins for the ones that break rows down.
const printMode = `## Context Usage

**Model:** claude-sonnet-5-5
**Tokens:** 35.5k / 1m (4%)

### Estimated usage by category

| Category | Tokens | Percentage |
|----------|--------|------------|
| System prompt | 2.3k | 0.2% |
| System tools | 14.6k | 1.5% |
| System tools (deferred) | 20.5k | 2.1% |
| Custom agents | 985 | 0.1% |
| Memory files | 11.5k | 1.2% |
| Skills | 6.1k | 0.6% |
| Messages | 10 | 0.0% |
| Free space | 931.5k | 93.1% |
| Autocompact buffer | 33k | 3.3% |

### Custom Agents

| Agent Type | Source | Tokens |
|------------|--------|--------|
| example-reviewer | User | 600 |
| example-planner | User | 385 |

### Memory Files

| Type | Path | Tokens |
|------|------|--------|
| User | /example/CLAUDE.md | 11.5k |

### Skills

| Skill | Source | Tokens |
|-------|--------|--------|
| example-skill | User | ~40 |
`;

const interactive = `
 Context Usage
 ⛁ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀   claude-opus-5 · 190k/1000k tokens (19%)
 ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀ ⛀
 ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶ ⛶

 ⛁ System prompt: 18k tokens (1.8%)
 ⛁ System tools: 12.5k tokens (1.3%)
 ⛁ Memory files: 7.5k tokens (0.8%)
 ⛁ Messages: 40k tokens (4.0%)
 ⛶ Free space: 810k (81.0%)
 ⛝ Autocompact buffer: 112k tokens (11.2%)

 Memory files · /memory
 └ CLAUDE.md: 7.5k tokens
`;

describe('parseReadout', () => {
  it('reads print mode’s first table and takes capacity from its header', () => {
    const parsed = parseReadout(printMode);

    expect(parsed.form).toBe('table');
    expect(parsed.capacity).toBe(1_000_000);
    expect(parsed.freeSpace).toBe(931_500);
    expect(parsed.rows.map((row) => [row.label, row.tokens, row.deferred])).toEqual([
      ['System prompt', 2_300, false],
      ['System tools', 14_600, false],
      ['System tools', 20_500, true],
      ['Custom agents', 985, false],
      ['Memory files', 11_500, false],
      ['Skills', 6_100, false],
      ['Messages', 10, false],
      ['Autocompact buffer', 33_000, false],
    ]);
  });

  it('never reads the later tables that break rows down', () => {
    const parsed = parseReadout(printMode);

    expect(parsed.rows.some((row) => row.label.includes('example'))).toBe(false);
    expect(parsed.rows).toHaveLength(8);
  });

  it('reads the interactive form with its glyphs, spacing, and decimals', () => {
    const parsed = parseReadout(interactive);

    expect(parsed.form).toBe('lines');
    expect(parsed.capacity).toBe(1_000_000);
    expect(parsed.freeSpace).toBe(810_000);
    expect(parsed.rows.map((row) => [row.label, row.tokens])).toEqual([
      ['System prompt', 18_000],
      ['System tools', 12_500],
      ['Memory files', 7_500],
      ['Messages', 40_000],
      ['Autocompact buffer', 112_000],
    ]);
  });

  it('skips the indented lines that break a category down', () => {
    expect(parseReadout(interactive).rows.some((row) => row.label === 'CLAUDE.md')).toBe(false);
  });

  it('reads header pairs written several ways', () => {
    expect(parseReadout('120k/1000k tokens (12%)').capacity).toBe(1_000_000);
    expect(parseReadout('120k/1M').capacity).toBe(1_000_000);
    expect(parseReadout('Tokens: 35.5k / 200k (18%)').capacity).toBe(200_000);
    expect(parseReadout('120,000/1,000,000 tokens').capacity).toBe(1_000_000);
  });

  it('has no capacity when there is no header', () => {
    const parsed = parseReadout('System prompt: 18k tokens (1.8%)\nMessages: 40k tokens (4.0%)');

    expect(parsed.capacity).toBeNull();
    expect(parsed.rows).toHaveLength(2);
  });

  it('does not mistake a date or a path for a header', () => {
    expect(parseReadout('Saved 2026/10/04 at /usr/bin/1/2').capacity).toBeNull();
  });

  it('finds nothing in text that is not a readout', () => {
    expect(parseReadout('hello there').form).toBe('none');
    expect(parseReadout('').rows).toEqual([]);
  });

  it('tolerates Windows line endings', () => {
    expect(
      parseReadout('System prompt: 2.3k tokens (0.2%)\r\nMessages: 10 tokens\r\n').rows,
    ).toHaveLength(2);
  });
});

describe('applyReadout', () => {
  it('sorts the print-mode rows into terms and leaves the deferred row out of every one', () => {
    const applied = applyReadout(parseReadout(printMode));

    expect(applied.capacity).toBe(1_000_000);
    expect(applied.values).toEqual({
      instructions: 2_300 + 985 + 11_500 + 6_100,
      tools: 14_600,
      history: 10,
      margin: 33_000,
    });
    expect(applied.deferred.map((row) => row.tokens)).toEqual([20_500]);
    expect(applied.unrecognized).toEqual([]);
  });

  it('lists rows it does not know without counting them', () => {
    const applied = applyReadout(
      parseReadout('System prompt: 18k tokens\nPlugin listing: 4k tokens'),
    );

    expect(applied.unrecognized.map((row) => row.label)).toEqual(['Plugin listing']);
    expect(applied.values).toEqual({ instructions: 18_000 });
  });

  it('adds up several rows that map to the same term', () => {
    const applied = applyReadout(parseReadout('System tools: 14.6k tokens\nMCP tools: 5k tokens'));

    expect(applied.values).toEqual({ tools: 19_600 });
  });

  it('merges repeated labels in the line form so each row has one entry and one count', () => {
    const parsed = parseReadout('⛁ Foo: 1k tokens\n⛁ Foo: 2k tokens\n⛁ Messages: 10k tokens');

    expect(parsed.rows.map((row) => [row.key, row.tokens])).toEqual([
      ['foo', 3000],
      ['messages', 10_000],
    ]);
    expect(applyReadout(parsed).unrecognized.map((row) => row.key)).toEqual(['foo']);
  });

  it('merges repeated labels in the table form too', () => {
    const parsed = parseReadout(
      '| Category | Tokens | Percentage |\n|---|---|---|\n| Foo | 1k | 0.1% |\n| Foo | 2k | 0.2% |',
    );

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].tokens).toBe(3000);
  });

  it('keeps a deferred row apart from a resident one with the same label', () => {
    const applied = applyReadout(
      parseReadout('System tools: 14k tokens\nSystem tools (deferred): 20k tokens'),
    );

    expect(applied.values).toEqual({ tools: 14_000 });
    expect(applied.deferred.map((row) => row.tokens)).toEqual([20_000]);
  });

  it.each(['constructor', 'Constructor', '⛁ CONSTRUCTOR'])(
    'lists a row labeled %s as unrecognized instead of finding an inherited value',
    (label) => {
      const applied = applyReadout(parseReadout(`⛁ ${label}: 5k tokens\n⛁ Messages: 10k tokens`));

      expect(applied.unrecognized.map((row) => row.key)).toEqual(['constructor']);
      expect(applied.values).toEqual({ history: 10_000 });
    },
  );
});

describe('scenarioFromReadout', () => {
  it('builds a scenario from the interactive readout, assuming 32K for the reply', () => {
    const scenario = scenarioFromReadout(applyReadout(parseReadout(interactive)));

    expect(scenario).toEqual({
      capacity: 1_000_000,
      instructions: 25_500,
      tools: 12_500,
      history: 40_000,
      generation: assumedReservedOutput,
      margin: 112_000,
    });
  });

  it('is null without a header, because the window size is unknown', () => {
    expect(scenarioFromReadout(applyReadout(parseReadout('System prompt: 18k tokens')))).toBeNull();
  });
});

describe('normalizeLabel', () => {
  it('lowercases and strips markup, glyphs, and the deferred marker', () => {
    expect(normalizeLabel('⛁ System  Tools (deferred)')).toBe('system tools');
    expect(normalizeLabel('**Skills**')).toBe('skills');
  });
});
