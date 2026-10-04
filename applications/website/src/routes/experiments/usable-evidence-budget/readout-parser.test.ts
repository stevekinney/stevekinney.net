import { describe, expect, it } from 'vitest';

import { applyReadout, defaultMapping, normalizeLabel, parseReadout } from './readout-parser';

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
    const applied = applyReadout(parseReadout(printMode), defaultMapping, 1_000_000);

    expect(applied.values).toEqual({
      instructions: 2_300 + 985 + 11_500 + 6_100,
      tools: 14_600,
      history: 10,
      margin: 33_000,
    });
    expect(applied.deferred.map((row) => row.tokens)).toEqual([20_500]);
    expect(applied.unrecognized).toEqual([]);
  });

  it('reconciles the real sample, which only works because deferred rows are not counted', () => {
    const applied = applyReadout(parseReadout(printMode), defaultMapping, 1_000_000);

    expect(applied.reconciliation).toMatchObject({
      expectedFree: 931_505,
      reportedFree: 931_500,
      mismatch: false,
    });

    const withDeferred = 1_000_000 - (68_495 + 20_500);
    expect(Math.abs(withDeferred - 931_500) / 1_000_000).toBeGreaterThan(0.01);
  });

  it('reconciles rows that sum to 190K against 810K free with no notice', () => {
    const applied = applyReadout(parseReadout(interactive), defaultMapping, 1_000_000);

    expect(applied.reconciliation?.mismatch).toBe(false);
    expect(applied.reconciliation).toMatchObject({ reportedFree: 810_000 });

    const exact = parseReadout(
      '190k/1000k tokens (19%)\nSystem prompt: 18k tokens\nMessages: 40k tokens\nAutocompact buffer: 132k tokens\nFree space: 810k',
    );
    const reconciled = applyReadout(exact, defaultMapping, 1_000_000);

    expect(reconciled.capacity).toBe(1_000_000);
    expect(reconciled.reconciliation).toMatchObject({
      expectedFree: 810_000,
      reportedFree: 810_000,
      difference: 0,
      mismatch: false,
    });
  });

  it('reports both numbers when they differ by more than 1% of the window', () => {
    const parsed = parseReadout('190k/1000k\nSystem prompt: 18k\nMessages: 40k\nFree space: 810k');
    const applied = applyReadout(parsed, defaultMapping, 1_000_000);

    expect(applied.reconciliation).toMatchObject({
      expectedFree: 942_000,
      reportedFree: 810_000,
      mismatch: true,
    });
  });

  it('keeps the current capacity when there is no header', () => {
    const applied = applyReadout(
      parseReadout('System prompt: 18k tokens\nFree space: 182k'),
      defaultMapping,
      200_000,
    );

    expect(applied.capacity).toBe(200_000);
    expect(applied.capacityFromHeader).toBe(false);
    expect(applied.reconciliation?.mismatch).toBe(false);
  });

  it('has nothing to reconcile without a free-space row', () => {
    const applied = applyReadout(
      parseReadout('System prompt: 18k tokens'),
      defaultMapping,
      1_000_000,
    );

    expect(applied.reconciliation).toBeNull();
  });

  it('lists rows with no mapping and counts them once they are assigned', () => {
    const parsed = parseReadout('System prompt: 18k tokens\nPlugin listing: 4k tokens');

    const before = applyReadout(parsed, defaultMapping, 1_000_000);
    expect(before.unrecognized.map((row) => row.label)).toEqual(['Plugin listing']);
    expect(before.values).toEqual({ instructions: 18_000 });

    const after = applyReadout(
      parsed,
      { ...defaultMapping, 'plugin listing': 'instructions' },
      1_000_000,
    );
    expect(after.unrecognized).toEqual([]);
    expect(after.values).toEqual({ instructions: 22_000 });
  });

  it('ignores rows the person assigned to ignore', () => {
    const parsed = parseReadout('System prompt: 18k tokens\nPlugin listing: 4k tokens');
    const applied = applyReadout(
      parsed,
      { ...defaultMapping, 'plugin listing': 'ignore' },
      1_000_000,
    );

    expect(applied.unrecognized).toEqual([]);
    expect(applied.values).toEqual({ instructions: 18_000 });
  });

  it('adds up several rows that map to the same term', () => {
    const applied = applyReadout(
      parseReadout('System tools: 14.6k tokens\nMCP tools: 5k tokens'),
      defaultMapping,
      1_000_000,
    );

    expect(applied.values).toEqual({ tools: 19_600 });
  });

  it('never sets generation, which the readout does not report', () => {
    const applied = applyReadout(parseReadout(printMode), defaultMapping, 1_000_000);

    expect('generation' in applied.values).toBe(false);
  });
});

describe('normalizeLabel', () => {
  it('lowercases and strips markup, glyphs, and the deferred marker', () => {
    expect(normalizeLabel('⛁ System  Tools (deferred)')).toBe('system tools');
    expect(normalizeLabel('**Skills**')).toBe('skills');
  });
});
