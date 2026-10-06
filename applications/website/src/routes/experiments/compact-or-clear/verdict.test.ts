import { describe, expect, it } from 'vitest';

import type { Projection } from './projection';
import { cheapest, paybackPhrase, verdictSentence } from './verdict';

const projection = (keep: number, compact: number, switched: number | null): Projection => ({
  summaryTokens: 0,
  parts: { summarize: 0, generate: 0, rebuild: 0, total: 0, summaryTokens: 0 },
  keep: [0, keep],
  compact: [0, compact],
  switch: switched === null ? null : [0, switched],
  switchCost: 0,
  compactCrossover: null,
  switchCrossover: null,
  compactCannotPay: false,
});

describe('cheapest', () => {
  it('picks the lowest total, and gives a tie to doing less', () => {
    expect(cheapest(projection(5.89, 4.46, 6.05))).toBe('compact');
    expect(cheapest(projection(3, 4, 2))).toBe('switch');
    expect(cheapest(projection(3, 3, 3))).toBe('keep');
    expect(cheapest(projection(3, 4, null))).toBe('keep');
  });
});

describe('verdictSentence', () => {
  it('names the cheapest move and what the others cost', () => {
    expect(verdictSentence(projection(5.89, 4.46, 6.05), 30, 'Claude Sonnet 5.5')).toBe(
      'Over the next 30 turns, compact now: it comes to $4.46, against $5.89 to keep going and $6.05 to switch to Claude Sonnet 5.5.',
    );
  });

  it('leaves out switching when there is nothing to switch to', () => {
    expect(verdictSentence(projection(2, 3, null), 1, null)).toBe(
      'Over the next 1 turn, keep going: it comes to $2.00, against $3.00 to compact now.',
    );
  });
});

describe('paybackPhrase', () => {
  it('says when a move pays for itself, and whether that is within the turns ahead', () => {
    expect(paybackPhrase(11, 30, 200)).toBe('pays for itself after 11 turns');
    expect(paybackPhrase(34, 30, 200)).toBe(
      'pays for itself after 34 turns, more than the 30 you have left',
    );
    expect(paybackPhrase(1, 30, 200)).toBe('pays for itself after 1 turn');
    expect(paybackPhrase(null, 30, 200)).toBe('doesn’t pay for itself within 200 turns');
    expect(paybackPhrase(null, 500, 500)).toBe('doesn’t pay for itself within 500 turns');
  });
});
