import { describe, expect, it } from 'vitest';

import {
  CARD_COUNT,
  dangerousPosition,
  dealCards,
  formatSeconds,
  parseSeed,
  seededRandom,
  summarizeRound,
} from './game';
import type { CardResult } from './game';

describe('acceptance check 6: the dangerous card', () => {
  it('lands at the same position for the same seed', () => {
    for (const seed of [0, 1, 42, 20261004, 4_294_967_295]) {
      expect(dangerousPosition(seed)).toBe(dangerousPosition(seed));
      expect(dealCards(seed)).toEqual(dealCards(seed));
    }
  });

  it('stays within positions 10 to 20 for any seed, and moves between seeds', () => {
    const positions = new Set<number>();

    for (let seed = 0; seed < 500; seed += 1) {
      const position = dangerousPosition(seed);
      expect(position).toBeGreaterThanOrEqual(10);
      expect(position).toBeLessThanOrEqual(20);
      positions.add(position);
    }

    // Every position from 10 to 20 turns up, ends included.
    expect([...positions].sort((first, second) => first - second)).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ]);
  });

  it('deals 20 cards with exactly one dangerous, at the position the seed names', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const cards = dealCards(seed);

      expect(cards).toHaveLength(CARD_COUNT);
      expect(cards.filter((card) => card.dangerous)).toHaveLength(1);
      expect(cards.findIndex((card) => card.dangerous) + 1).toBe(dangerousPosition(seed));
    }
  });

  it('never repeats a routine card within a round', () => {
    const requests = dealCards(7).map((card) => card.request);

    expect(new Set(requests).size).toBe(CARD_COUNT);
  });
});

describe('seededRandom', () => {
  it('returns numbers in [0, 1) and repeats for a seed', () => {
    const first = seededRandom(99);
    const second = seededRandom(99);

    for (let index = 0; index < 100; index += 1) {
      const value = first();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(second()).toBe(value);
    }
  });
});

describe('parseSeed', () => {
  it('takes whole numbers up to 2^32 − 1', () => {
    expect(parseSeed('42')).toBe(42);
    expect(parseSeed(' 1,000 ')).toBe(1_000);
    expect(parseSeed('4294967295')).toBe(4_294_967_295);
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1.5')).toBeNull();
    expect(parseSeed('')).toBeNull();
  });
});

describe('summarizeRound', () => {
  const cards = dealCards(3);
  const position = cards.findIndex((card) => card.dangerous) + 1;
  const results = (denied: number[], slowAfter = 10): CardResult[] =>
    cards.map((_, index) => ({
      position: index + 1,
      decision: denied.includes(index + 1) ? 'deny' : 'allow',
      milliseconds: index + 1 > slowAfter ? 600 : 2_000,
    }));

  it('says you caught it when you denied the dangerous card', () => {
    expect(summarizeRound(cards, results([position])).caught).toBe(true);
  });

  it('says you missed it when you allowed it, and counts denied routine cards', () => {
    const other = position === 1 ? 2 : 1;
    const summary = summarizeRound(cards, results([other]));

    expect(summary.caught).toBe(false);
    expect(summary.falseAlarms).toBe(1);
    expect(summary.dangerousPosition).toBe(position);
  });

  it('compares your pace in the first and second halves', () => {
    const summary = summarizeRound(cards, results([]));

    expect(summary.medianFirstHalf).toBe(2_000);
    expect(summary.medianSecondHalf).toBe(600);
  });

  it('formats seconds', () => {
    expect(formatSeconds(1_449)).toBe('1.4 s');
  });
});
