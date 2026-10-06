import { describe, expect, it } from 'vitest';

import { analyze, checkPairing, costPerAccepted, splitRows } from './analysis';
import type { Analysis, AnalysisSettings, MeanComparison } from './analysis';
import { guessMapping } from './columns';
import { buildDataset } from './dataset';
import { formatInterval, formatNumber, formatP, formatPercent } from './display';
import { parsePasted } from './parse-table';
import { findPreset } from './presets';
import type { PresetId } from './presets';
import { describeVerdict } from './verdict';

const settings: AnalysisSettings = {
  endpoint: 'time',
  preferPaired: true,
  alpha: 0.05,
  power: 0.8,
};

const load = (csv: string) => {
  const parsed = parsePasted(csv);
  if (!parsed.ok) throw new Error(parsed.error);

  const mapping = guessMapping(parsed.table.columns);

  return { dataset: buildDataset(parsed.table, mapping), mapping };
};

const run = (csv: string, overrides: Partial<AnalysisSettings> = {}): Analysis => {
  const { dataset, mapping } = load(csv);

  return analyze(
    dataset,
    {
      minutes: mapping.minutes !== null,
      rework: mapping.rework !== null,
      reviewMinutes: mapping.reviewMinutes !== null,
    },
    { ...settings, ...overrides },
  );
};

const preset = (id: PresetId): string => findPreset(id)!.csv;

const means = (analysis: Analysis): MeanComparison => {
  if (analysis.comparison?.kind !== 'mean') throw new Error('Expected a comparison of means');

  return analysis.comparison;
};

describe('acceptance 1: five tasks, unpaired', () => {
  const analysis = run(preset('five-unpaired'));
  const { test, percent, design } = means(analysis);

  it('compares by Welch, because there are no tasks to pair', () => {
    expect(design).toBe('unpaired');
  });

  it('has means 48.0 and 40.8, a difference of 7.2 min (15.0%)', () => {
    expect(formatNumber(test.meanA, 1)).toBe('48.0');
    expect(formatNumber(test.meanB, 1)).toBe('40.8');
    expect(test.difference).toBeCloseTo(7.2, 10);
    expect(formatPercent(percent ?? Number.NaN)).toBe('15.0%');
  });

  it('has SE 7.70, Welch df 6.04, and t critical value 2.443', () => {
    expect(test.standardError.toFixed(2)).toBe('7.70');
    expect(test.degreesOfFreedom?.toFixed(2)).toBe('6.04');
    expect(test.critical?.toFixed(3)).toBe('2.443');
  });

  it('has a 95% CI of [−11.6, 26.0] and p ≈ 0.385', () => {
    expect(formatInterval(test.lower, test.upper, 1)).toBe('[−11.6, 26.0]');
    expect(formatP(test.p)).toBe('0.385');
  });

  it('says “can’t tell”, with what the data is consistent with and how many tasks would settle it', () => {
    expect(analysis.verdict?.kind).toBe('cant-tell');

    const text = describeVerdict(analysis)!;
    expect(text.headline).toBe('Can’t tell.');
    expect(text.body).toBe(
      'The data is consistent with anything from B being 11.6 minutes slower to 26.0 minutes faster per task.',
    );
    // Pooled σ = √((232.5 + 63.7) / 2) = 12.17, δ = 7.2: 2 × 7.849 × 148.1 / 51.84 = 44.85.
    expect(text.detail).toBe(
      'If the real difference is the 7.2 minutes you saw, about 45 tasks per condition would settle it.',
    );
  });
});

describe('acceptance 2: the same five tasks, paired', () => {
  const analysis = run(preset('five-paired'));
  const comparison = means(analysis);
  const { test } = comparison;

  it('pairs automatically, because every task appears once under each condition', () => {
    expect(comparison.design).toBe('paired');
    expect(comparison.pairing).toEqual({ possible: true, tasks: 5 });
  });

  it('has differences 5, 9, 4, 10, 7 with a mean of 7.0 (14.6%)', () => {
    expect(comparison.valuesA.map((value, index) => value - comparison.valuesB[index])).toEqual([
      5, 9, 4, 10, 7,
    ]);
    expect(test.difference).toBe(7);
    expect(formatPercent(comparison.percent ?? Number.NaN)).toBe('14.6%');
  });

  it('has SD 2.55 and SE 1.14', () => {
    if (!('differenceDeviation' in test)) throw new Error('Expected a paired test');

    expect(test.differenceDeviation.toFixed(2)).toBe('2.55');
    expect(test.standardError.toFixed(2)).toBe('1.14');
    expect(test.degreesOfFreedom).toBe(4);
  });

  it('has a 95% CI of [3.83, 10.17] and p ≈ 0.0036', () => {
    expect(formatInterval(test.lower, test.upper, 2)).toBe('[3.83, 10.17]');
    expect(formatP(test.p)).toBe('0.0036');
  });

  it('says “distinguishable”, naming the direction and size', () => {
    expect(analysis.verdict?.kind).toBe('distinguishable');

    const text = describeVerdict(analysis)!;
    expect(text.headline).toBe('Distinguishable.');
    expect(text.body).toBe(
      'B is 3.83–10.17 minutes faster per task than A. The 95% interval leaves out zero.',
    );
  });

  it('falls back to Welch when pairing is switched off, and then can’t tell', () => {
    const unpaired = run(preset('five-paired'), { preferPaired: false });

    expect(means(unpaired).design).toBe('unpaired');
    expect(unpaired.verdict?.kind).toBe('cant-tell');
  });
});

describe('faster but more rework', () => {
  it('is distinguishable on time: B is 20% faster', () => {
    const analysis = run(preset('faster-more-rework'));

    expect(means(analysis).percent).toBeCloseTo(20, 10);
    expect(analysis.verdict?.kind).toBe('distinguishable');
    expect(describeVerdict(analysis)?.body).toMatch(/^B is .* minutes faster per task than A\./);
  });

  it('can’t tell on rework, where B’s rate doubles from 18.8% to 37.5%', () => {
    const analysis = run(preset('faster-more-rework'), { endpoint: 'rework' });

    expect(analysis.comparison?.kind).toBe('rate');
    if (analysis.comparison?.kind !== 'rate') return;
    expect(analysis.comparison.a.rate).toBe(3 / 16);
    expect(analysis.comparison.b.rate).toBe(6 / 16);
    expect(analysis.verdict?.kind).toBe('cant-tell');
    expect(describeVerdict(analysis)?.body).toMatch(
      /^The data is consistent with anything from B’s rework rate being .* points higher to .* points lower\.$/,
    );
  });

  it('is distinguishable on review minutes, the other way: B needs more', () => {
    const analysis = run(preset('faster-more-rework'), { endpoint: 'review' });

    expect(analysis.verdict?.kind).toBe('distinguishable');
    expect(describeVerdict(analysis)?.body).toMatch(/^B needs .* more review minutes per task/);
  });

  it('leaves the percentage unavailable when A’s mean is zero, in both designs', () => {
    const csv = [
      'condition,task,minutes,review_minutes',
      'A,one,30,0',
      'A,two,40,0',
      'A,three,35,0',
      'B,one,31,4',
      'B,two,42,6',
      'B,three,33,5',
    ].join('\n');

    for (const preferPaired of [true, false]) {
      const comparison = means(run(csv, { endpoint: 'review', preferPaired }));

      expect(comparison.design).toBe(preferPaired ? 'paired' : 'unpaired');
      expect(comparison.test.meanA).toBe(0);
      expect(comparison.percent).toBeNull();
      expect(Number.isFinite(comparison.test.difference)).toBe(true);
    }
  });

  it('raises the cost per accepted result from $1.28 to $1.87', () => {
    const { dataset } = load(preset('faster-more-rework'));
    const [rowsA, rowsB] = splitRows(dataset);

    expect(costPerAccepted(rowsA)?.value).toBeCloseTo(19.2 / 15, 10);
    expect(costPerAccepted(rowsB)?.value).toBeCloseTo(22.4 / 12, 10);
  });
});

describe('acceptance 6: vanity metrics', () => {
  it('gives no verdict at all when there’s no outcome column', () => {
    const analysis = run(preset('vanity'));

    expect(analysis.endpoints).toEqual([]);
    expect(analysis.verdict).toBeNull();
    expect(describeVerdict(analysis)).toBeNull();
  });

  it('gives no verdict for a CSV whose only numeric columns are loc and acceptance_rate', () => {
    const analysis = run(
      'condition,loc,acceptance_rate\nA,100,0.5\nA,120,0.6\nB,300,0.8\nB,280,0.9\n',
    );

    expect(analysis.verdict).toBeNull();
  });
});

describe('not measured', () => {
  it('when there’s only one condition', () => {
    const analysis = run('condition,minutes\nA,10\nA,12\nA,14\n');

    expect(analysis.verdict).toMatchObject({ kind: 'not-measured' });
    expect(describeVerdict(analysis)?.body).toContain('no baseline');
    expect(describeVerdict(analysis)?.detail).toContain('legitimate');
  });

  it('when a condition has one row', () => {
    const analysis = run('condition,minutes\nA,10\nA,12\nB,9\n');

    expect(analysis.verdict).toMatchObject({ kind: 'not-measured' });
    expect(describeVerdict(analysis)?.body).toBe(
      '“B” has only one task with a duration. It takes at least two under each condition to see how much tasks vary.',
    );
  });

  it('measures rework with one task under a condition, since a rate needs no spread', () => {
    const analysis = run('condition,minutes,rework\nA,10,yes\nA,12,no\nB,9,no\n', {
      endpoint: 'rework',
    });

    expect(analysis.comparison?.kind).toBe('rate');
    expect(analysis.verdict?.kind).not.toBe('not-measured');
  });

  it('when a condition has no rework values', () => {
    const analysis = run('condition,minutes,rework\nA,10,yes\nA,12,no\nB,9,\n', {
      endpoint: 'rework',
    });

    expect(analysis.verdict).toMatchObject({ kind: 'not-measured' });
    expect(describeVerdict(analysis)?.body).toBe(
      '“B” has no tasks with a rework value. It takes at least one under each condition to compare rates.',
    );
  });

  it('when there’s no data at all', () => {
    expect(run('condition,minutes\n').verdict).toMatchObject({ kind: 'not-measured' });
  });

  it('when every value is identical, without dividing by zero, and calls the interval degenerate', () => {
    const analysis = run('condition,minutes\nA,10\nA,10\nB,8\nB,8\n');
    const { test } = means(analysis);

    expect(test.degenerate).toBe(true);
    expect(test.standardError).toBe(0);
    expect(test.lower).toBe(2);
    expect(test.upper).toBe(2);
    expect(test.p).toBeNull();
    expect(analysis.verdict).toMatchObject({ kind: 'not-measured', degenerate: true });
    expect(describeVerdict(analysis)?.body).toContain('degenerate');
  });

  it('still compares when only one condition has no spread', () => {
    const analysis = run('condition,minutes\nA,10\nA,10\nA,10\nB,8\nB,9\nB,7\n');
    const { test } = means(analysis);

    expect(test.degenerate).toBe(false);
    // With A's term gone, Welch's df is B's n − 1.
    expect(test.degreesOfFreedom).toBeCloseTo(2, 10);
  });

  it('is degenerate when every paired difference is the same', () => {
    const analysis = run('condition,task,minutes\nA,x,10\nA,y,20\nB,x,8\nB,y,18\n');

    expect(means(analysis).design).toBe('paired');
    expect(analysis.verdict).toMatchObject({ kind: 'not-measured', degenerate: true });
  });
});

describe('unequal groups and pairing fallbacks', () => {
  it('handles unequal group sizes', () => {
    const analysis = run('condition,minutes\nA,10\nA,12\nA,14\nA,16\nB,9\nB,11\n');
    const { test } = means(analysis);

    expect(test.meanA).toBe(13);
    expect(test.meanB).toBe(10);
    expect(Number.isFinite(test.degreesOfFreedom)).toBe(true);
  });

  it('falls back to unpaired and says why when a task is in only one condition', () => {
    const analysis = run(
      'condition,task,minutes\nA,t1,10\nA,t2,12\nA,t3,30\nB,t1,9\nB,t2,11\nB,t4,8\n',
    );
    const comparison = means(analysis);

    expect(comparison.design).toBe('unpaired');
    expect(comparison.pairing).toEqual({
      possible: false,
      reason:
        '2 tasks appear under only one condition, such as “t3”. Pairing needs every task under both.',
    });
  });

  it('falls back when a task repeats under one condition', () => {
    const { dataset } = load('condition,task,minutes\nA,t1,10\nA,t1,12\nB,t1,9\nB,t2,11\n');
    const [rowsA, rowsB] = splitRows(dataset);

    expect(checkPairing(rowsA, rowsB, dataset.labels)).toEqual({
      possible: false,
      reason: 'Task “t1” appears more than once under A.',
    });
  });

  it('explains when there’s no task column', () => {
    expect(means(run(preset('five-unpaired'))).pairing).toMatchObject({
      possible: false,
      reason: expect.stringContaining('no task column'),
    });
  });

  it('uses the first condition it meets as A, whatever the labels', () => {
    const analysis = run('workflow,duration\nafter,30\nbefore,40\nafter,32\nbefore,44\n');

    expect(analysis.labels).toEqual(['after', 'before']);
    expect(means(analysis).test.difference).toBe(-11);
    expect(describeVerdict(analysis)?.body).toContain('before');
  });
});

describe('verdict language', () => {
  it('never says “significant” or “proves”', () => {
    const cases = [
      run(preset('five-unpaired')),
      run(preset('five-paired')),
      run(preset('faster-more-rework')),
      run(preset('faster-more-rework'), { endpoint: 'rework' }),
      run(preset('faster-more-rework'), { endpoint: 'review' }),
      run('condition,minutes\nA,10\nA,10\nB,8\nB,8\n'),
      run('condition,minutes\nA,10\n'),
    ];

    for (const analysis of cases) {
      const text = describeVerdict(analysis);
      const words = `${text?.headline} ${text?.body} ${text?.detail}`.toLowerCase();

      expect(words).not.toMatch(/significan|prove/);
    }
  });

  it('describes B as slower when the interval is all below zero', () => {
    const analysis = run('condition,minutes\nA,10\nA,11\nA,12\nB,20\nB,21\nB,22\n');

    expect(describeVerdict(analysis)?.body).toMatch(/^B is .* minutes slower per task than A\./);
  });
});
