import { describe, expect, it } from 'vitest';

import { compactionRatio, formatPercent, median, summarizeCompactions } from './compactions';

const event = (trigger: string, preTokens: number, postTokens: number) => ({
  sessionId: 's',
  timestamp: null,
  trigger,
  preTokens,
  postTokens,
  file: 's.jsonl',
});

describe('compactionRatio (acceptance check 7)', () => {
  it('shows 312,693 tokens compacted to 12,969 as 4.1%', () => {
    expect(formatPercent(compactionRatio({ preTokens: 312_693, postTokens: 12_969 }))).toBe('4.1%');
  });

  it('has no ratio without a size before', () => {
    expect(compactionRatio({ preTokens: 0, postTokens: 10 })).toBeNull();
    expect(formatPercent(null)).toBe('—');
  });
});

describe('summarizeCompactions', () => {
  it('splits manual from auto and takes the median ratio', () => {
    expect(
      summarizeCompactions([
        event('manual', 100, 10),
        event('auto', 100, 20),
        event('auto', 100, 40),
        event('other', 0, 5),
      ]),
    ).toEqual({ manual: 1, auto: 2, other: 1, medianRatio: 0.2 });
  });
});

describe('median', () => {
  it('averages the middle two of an even count', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
