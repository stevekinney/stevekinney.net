import { describe, expect, it } from 'vitest';

import { analyze } from './analysis';
import { guessMapping } from './columns';
import { buildDataset } from './dataset';
import { parseCsv, parsePasted } from './parse-table';
import { findPreset } from './presets';
import type { PresetId } from './presets';
import { buildSummary } from './summary';

const summaryOf = (id: PresetId): string => {
  const parsed = parseCsv(findPreset(id)!.csv);
  if (!parsed.ok) throw new Error(parsed.error);
  const mapping = guessMapping(parsed.table.columns);
  const analysis = analyze(
    buildDataset(parsed.table, mapping),
    {
      minutes: mapping.minutes !== null,
      rework: mapping.rework !== null,
      reviewMinutes: mapping.reviewMinutes !== null,
    },
    { endpoint: 'time', preferPaired: true, alpha: 0.05, power: 0.8 },
  );

  return buildSummary(analysis, findPreset(id)!.name);
};

describe('buildSummary', () => {
  it('has the verdict, the interval, the endpoint, and n', () => {
    expect(summaryOf('five-unpaired')).toBe(
      [
        '### Is the Difference Real?',
        '',
        '- Data: Five tasks, unpaired',
        '- Endpoint: Time to accepted result (A − B)',
        '- Design: unpaired, n = 5 (A) and 5 (B)',
        '- Means: A 48.0, B 40.8',
        '- Difference: 7.2 minutes (15.0% of A)',
        '- 95% interval: [−11.6, 26.0], p ≈ 0.385',
        '',
        '**Can’t tell.** The data is consistent with anything from B being 11.6 minutes slower to 26.0 minutes faster per task.',
        '',
        'If the real difference is the 7.2 minutes you saw, about 45 tasks per condition would settle it.',
        '',
      ].join('\n'),
    );
  });

  it('names the paired design', () => {
    const summary = summaryOf('five-paired');

    expect(summary).toContain('- Design: paired, n = 5 tasks run under both');
    expect(summary).toContain('- 95% interval: [3.83, 10.17], p ≈ 0.0036');
    expect(summary).toContain(
      '**Distinguishable.** B is 3.83–10.17 minutes faster per task than A.',
    );
  });

  it('gives no verdict for vanity metrics', () => {
    const summary = summaryOf('vanity');

    expect(summary).toContain('**No verdict.** This isn’t an outcome.');
    expect(summary).not.toMatch(/Distinguishable|Can’t tell|Not measured/);
  });

  it('keeps the absolute difference but drops the percentage when A’s mean is zero', () => {
    const parsed = parsePasted(
      [
        'condition,task,minutes,review_minutes',
        'A,one,30,0',
        'A,two,40,0',
        'B,one,31,4',
        'B,two,42,6',
      ].join('\n'),
    );
    if (!parsed.ok) throw new Error(parsed.error);
    const mapping = guessMapping(parsed.table.columns);
    const analysis = analyze(
      buildDataset(parsed.table, mapping),
      { minutes: true, rework: false, reviewMinutes: true },
      { endpoint: 'review', preferPaired: true, alpha: 0.05, power: 0.8 },
    );
    const summary = buildSummary(analysis, 'Zero review');

    expect(summary).toMatch(/- Difference: −5(\.0)? review minutes\n/);
    expect(summary).toContain('- 95% interval:');
    expect(summary).not.toContain('% of A');
  });
});
