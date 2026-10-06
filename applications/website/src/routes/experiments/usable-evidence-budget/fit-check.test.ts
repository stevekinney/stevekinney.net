import { describe, expect, it } from 'vitest';

import type { Scenario } from './budget';
import { usable } from './budget';
import {
  calibrate,
  estimateTokens,
  exportPaths,
  moveItem,
  planFit,
  sortFiles,
  suggestCuts,
  suggestTermReductions,
  summarizeEvidence,
} from './fit-check';
import type { EvidenceFile } from './fit-check';
import { findPreset } from './presets';

const file = (path: string, characters: number, selected = true): EvidenceFile => ({
  id: path,
  path,
  characters,
  bytes: characters,
  selected,
});

const deep: Scenario = { ...(findPreset('deep')?.scenario as Scenario) };

describe('estimateTokens', () => {
  it('divides characters by characters per token', () => {
    expect(estimateTokens(400_000, 4)).toBe(100_000);
    expect(estimateTokens(400_000, 5)).toBe(80_000);
  });

  it('rounds up, so an estimate never flatters the fit', () => {
    expect(estimateTokens(10, 4)).toBe(3);
    expect(estimateTokens(0, 4)).toBe(0);
  });

  it('ignores floating-point noise just above a whole number', () => {
    expect(estimateTokens(123_456, 123_456 / 31_000)).toBe(31_000);
  });
});

describe('calibrate', () => {
  it('derives characters per token from a known count: 400,000 characters at 80K tokens is 5', () => {
    expect(calibrate(400_000, 80_000)).toBe(5);
  });

  it('re-estimates every file from the new ratio', () => {
    const ratio = calibrate(400_000, 80_000) as number;

    expect(estimateTokens(400_000, ratio)).toBe(80_000);
    expect(estimateTokens(100_000, ratio)).toBe(20_000);
  });

  it('refuses a count that cannot give a ratio', () => {
    expect(calibrate(400_000, 0)).toBeNull();
    expect(calibrate(0, 100)).toBeNull();
    expect(calibrate(400_000, 400_000_000)).toBeNull();
    expect(calibrate(400_000, 1)).toBeNull();
  });
});

describe('planFit in manual mode', () => {
  it('includes the checked files, and shows one 400,000-character file as 100K that fits the deep preset with 73K to spare', () => {
    const plan = planFit([file('a.log', 400_000)], 4, usable(deep), 'manual');
    const summary = summarizeEvidence(plan.evidence, usable(deep));

    expect(plan.tokens).toEqual([100_000]);
    expect(plan.evidence).toBe(100_000);
    expect(summary.fits).toBe(true);
    expect(summary.spare).toBe(73_000);
  });

  it('reports a second file of the same size as over by 27K', () => {
    const plan = planFit(
      [file('a.log', 400_000), file('b.log', 400_000)],
      4,
      usable(deep),
      'manual',
    );
    const summary = summarizeEvidence(plan.evidence, usable(deep));

    expect(plan.evidence).toBe(200_000);
    expect(summary.fits).toBe(false);
    expect(summary.over).toBe(27_000);
  });

  it('leaves unchecked files out', () => {
    const plan = planFit([file('a', 400), file('b', 400, false)], 4, 1_000, 'manual');

    expect(plan.statuses).toEqual(['included', 'unchecked']);
    expect(plan.evidence).toBe(100);
  });
});

describe('planFit in fill mode', () => {
  it('stops at the first file that does not fit and marks everything after it', () => {
    const files = [file('a', 400), file('b', 4_000), file('c', 40)];
    const plan = planFit(files, 4, 500, 'fill');

    expect(plan.statuses).toEqual(['included', 'overflow', 'overflow']);
    expect(plan.evidence).toBe(100);
  });

  it('skips unchecked files without stopping', () => {
    const files = [file('a', 400), file('b', 4_000, false), file('c', 400)];
    const plan = planFit(files, 4, 500, 'fill');

    expect(plan.statuses).toEqual(['included', 'unchecked', 'included']);
    expect(plan.evidence).toBe(200);
  });

  it('fits nothing when the window is over-committed', () => {
    const plan = planFit([file('a', 400)], 4, -50_000, 'fill');

    expect(plan.statuses).toEqual(['overflow']);
    expect(plan.evidence).toBe(0);
  });
});

describe('planFit in smallest-first mode', () => {
  it('fits as many files as it can', () => {
    const files = [file('big', 4_000), file('small', 40), file('medium', 400)];
    const plan = planFit(files, 4, 120, 'smallest');

    expect(plan.statuses).toEqual(['overflow', 'included', 'included']);
    expect(plan.includedCount).toBe(2);
    expect(plan.evidence).toBe(110);
  });
});

describe('suggestCuts', () => {
  const included = [
    { id: 'a', path: 'a', tokens: 100_000 },
    { id: 'b', path: 'b', tokens: 100_000 },
  ];

  it('suggests nothing when the evidence fits', () => {
    expect(suggestCuts(included, 200_000)).toBeNull();
  });

  it('removes the fewest, largest files that make the rest fit', () => {
    const cuts = suggestCuts(included, 173_000);

    expect(cuts?.files).toHaveLength(1);
    expect(cuts?.remaining).toBe(100_000);
    expect(cuts?.possible).toBe(true);
  });

  it('prefers large files over several small ones', () => {
    const cuts = suggestCuts(
      [
        { id: 'a', path: 'a', tokens: 10 },
        { id: 'b', path: 'b', tokens: 500 },
        { id: 'c', path: 'c', tokens: 20 },
        { id: 'd', path: 'd', tokens: 300 },
      ],
      400,
    );

    expect(cuts?.files.map((entry) => entry.id)).toEqual(['b']);
  });

  it('cuts the lowest priority first among files of the same size', () => {
    const cuts = suggestCuts(included, 173_000);

    expect(cuts?.files.map((entry) => entry.id)).toEqual(['b']);
  });

  it('says so when removing every file would still leave the window over-committed', () => {
    const cuts = suggestCuts(included, -50_000);

    expect(cuts?.possible).toBe(false);
    expect(cuts?.remaining).toBe(0);
  });
});

describe('suggestTermReductions', () => {
  it('names the single term moves that absorb the shortfall, such as tool definitions from 180K to 84K', () => {
    const heavy = { ...(findPreset('mcp-heavy')?.scenario as Scenario) };
    const reductions = suggestTermReductions(heavy, 96_000);

    expect(reductions[0]).toMatchObject({ key: 'tools', from: 180_000, to: 84_000 });
    expect(reductions.map((entry) => entry.key)).toEqual(['tools', 'margin']);
  });

  it('offers nothing when no single term is big enough', () => {
    expect(suggestTermReductions(deep, 900_000)).toEqual([]);
  });
});

describe('summarizeEvidence', () => {
  it('shows the share of the usable budget', () => {
    expect(summarizeEvidence(412_000, 810_000).share).toBeCloseTo(50.86, 1);
  });

  it('has no share when nothing is usable', () => {
    expect(summarizeEvidence(100, -50).share).toBeNull();
    expect(summarizeEvidence(100, 0).fits).toBe(false);
  });

  it('counts evidence exactly equal to the budget as fitting with nothing to spare', () => {
    expect(summarizeEvidence(810_000, 810_000)).toMatchObject({ fits: true, spare: 0, over: 0 });
  });
});

describe('list helpers', () => {
  it('exports one path per line', () => {
    expect(exportPaths(['a.ts', 'b/c.ts'])).toBe('a.ts\nb/c.ts\n');
    expect(exportPaths([])).toBe('');
  });

  it('moves an item and clamps at the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 3)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by size and by name in either direction', () => {
    const files = [file('b.ts', 20), file('a.ts', 30), file('c.ts', 10)];

    expect(sortFiles(files, 'size', true).map((entry) => entry.path)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
    ]);
    expect(sortFiles(files, 'size', false).map((entry) => entry.path)).toEqual([
      'c.ts',
      'b.ts',
      'a.ts',
    ]);
    expect(sortFiles(files, 'name', false).map((entry) => entry.path)).toEqual([
      'a.ts',
      'b.ts',
      'c.ts',
    ]);
    expect(sortFiles(files, 'name', true).map((entry) => entry.path)).toEqual([
      'c.ts',
      'b.ts',
      'a.ts',
    ]);
  });

  it('sorts names with numbers the way a person would', () => {
    const files = [file('log10.txt', 1), file('log2.txt', 1)];

    expect(sortFiles(files, 'name', false).map((entry) => entry.path)).toEqual([
      'log2.txt',
      'log10.txt',
    ]);
  });
});
