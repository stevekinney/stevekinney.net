import { describe, expect, it } from 'vitest';

import { completedMessage, describeFailure, formatMinutes, summarizeResults } from './results';
import type { ItemResult } from './schedule';

/** Fifty items, with items 4, 18, and 33 null. */
const fiftyWithThreeNulls: ItemResult[] = Array.from({ length: 50 }, (_, item) =>
  [3, 17, 32].includes(item)
    ? { item, value: 'null', reason: 'stopped', stage: 0 }
    : { item, value: 'value', reason: 'value', stage: null },
);

describe('acceptance check 3: silent drops', () => {
  it('leaves 47 results with .filter(Boolean) and says 3 were dropped silently', () => {
    const summary = summarizeResults(fiftyWithThreeNulls, 'filter');

    expect(summary.length).toBe(47);
    expect(summary.received.every((result) => result.value === 'value')).toBe(true);
    expect(summary.headline).toBe('47 of 50 items (3 dropped silently)');
    expect(summary.reported).toBe('Run completed — 47 results');
  });

  it('keeps all 50 with nulls kept, 3 of them null', () => {
    const summary = summarizeResults(fiftyWithThreeNulls, 'keep');

    expect(summary.length).toBe(50);
    expect(summary.nulls).toBe(3);
    expect(
      summary.received.filter((result) => result.value === 'null').map((result) => result.item),
    ).toEqual([3, 17, 32]);
    expect(summary.headline).toBe('Run completed — 50 results (3 are null)');
  });
});

describe('summarizeResults', () => {
  it('reads as a plain completion when nothing is null', () => {
    const all = fiftyWithThreeNulls.map((result) => ({ ...result, value: 'value' as const }));

    expect(summarizeResults(all, 'filter').headline).toBe('Run completed — 50 results');
    expect(summarizeResults(all, 'keep').headline).toBe('Run completed — 50 results');
  });

  it('reports a run where every item is null as completed with no results', () => {
    const none = fiftyWithThreeNulls.map((result) => ({ ...result, value: 'null' as const }));

    expect(summarizeResults(none, 'filter').headline).toBe('0 of 50 items (50 dropped silently)');
    expect(summarizeResults(none, 'filter').reported).toBe('Run completed — 0 results');
  });

  it('uses the singular for one result and one null', () => {
    expect(completedMessage(1)).toBe('Run completed — 1 result');
    const one: ItemResult[] = [
      { item: 0, value: 'null', reason: 'stopped', stage: 0 },
      { item: 1, value: 'value', reason: 'value', stage: null },
    ];
    expect(summarizeResults(one, 'keep').headline).toBe('Run completed — 2 results (1 is null)');
  });
});

describe('describeFailure', () => {
  it('says the run failed and the script got no array', () => {
    expect(describeFailure({ item: 1, stage: 0, time: 2 }, 'Review')).toBe(
      'Run failed at 2 min: item 2’s Review agent threw, nothing caught it, and the script never received a results array.',
    );
  });
});

describe('formatMinutes', () => {
  it('shows whole minutes without a decimal and tenths with one', () => {
    expect(formatMinutes(11)).toBe('11 min');
    expect(formatMinutes(4.5)).toBe('4.5 min');
  });
});
