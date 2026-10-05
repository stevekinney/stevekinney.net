import { describe, expect, it } from 'vitest';

import {
  advance,
  currentId,
  isFinished,
  isSeed,
  missedIds,
  pick,
  results,
  retryMisses,
  score,
  seededRandom,
  shuffle,
  startGame,
} from './deal';
import type { GameState } from './deal';
import type { MechanismId } from './mechanisms';
import { outlineScenarios } from './scenarios';

const deck = outlineScenarios;

/** Plays a whole round, picking the right answer except for the given cards. */
const play = (state: GameState, wrong: Record<string, MechanismId>): GameState => {
  let next = state;
  while (!isFinished(next)) {
    const id = currentId(next)!;
    const scenario = deck.find((entry) => entry.id === id)!;
    next = advance(pick(next, wrong[id] ?? scenario.answer));
  }

  return next;
};

describe('seededRandom', () => {
  it('gives the same sequence for the same seed and a different one for another', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const other = seededRandom(43);
    const a = [first(), first(), first()];

    expect([second(), second(), second()]).toEqual(a);
    expect([other(), other(), other()]).not.toEqual(a);
    for (const value of a) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('acceptance 4: the sorting game', () => {
  it('deals the same order for the same seed', () => {
    expect(startGame(deck, 1234).order).toEqual(startGame(deck, 1234).order);
  });

  it('deals every card exactly once, in a different order for a different seed', () => {
    const order = startGame(deck, 1234).order;

    expect([...order].sort()).toEqual(deck.map((scenario) => scenario.id).sort());
    expect(startGame(deck, 99).order).not.toEqual(order);
  });

  it('retries only the missed cards, in the order they were dealt', () => {
    const state = startGame(deck, 7);
    const missed = [state.order[2], state.order[9], state.order[15]];
    const wrong = Object.fromEntries(
      missed.map((id) => [id, id === 'one-edit' ? 'workflow' : 'prompt'] as const),
    ) as Record<string, MechanismId>;
    const finished = play(state, wrong);

    expect(missedIds(finished, deck)).toEqual(missed);

    const retry = retryMisses(finished, deck);
    expect(retry.order).toEqual(missed);
    expect(retry.retry).toBe(true);
    expect(retry.position).toBe(0);
    expect(retry.picks).toEqual({});
  });

  it('retries nothing after a perfect round', () => {
    const finished = play(startGame(deck, 7), {});

    expect(retryMisses(finished, deck).order).toEqual([]);
  });
});

describe('the round', () => {
  it('reveals on a pick, ignores a second pick, and moves on only once revealed', () => {
    const state = startGame(deck, 5);

    expect(advance(state)).toBe(state);

    const picked = pick(state, 'hook');
    expect(picked.revealed).toBe(true);
    expect(pick(picked, 'skill').picks[currentId(state)!]).toBe('hook');

    const moved = advance(picked);
    expect(moved.position).toBe(1);
    expect(moved.revealed).toBe(false);
  });

  it('keeps score, counting a defensible alternative as its own kind of match', () => {
    const state = startGame(deck, 5);
    const finished = play(state, { 'never-read-env': 'sandbox', 'monday-audit': 'hook' });

    expect(score(finished, deck)).toEqual({
      answered: 18,
      matched: 16,
      alternatives: 1,
      missed: 1,
    });
    expect(results(finished, deck).map((result) => result.scenario.id)).toEqual(finished.order);
  });
});

describe('shuffle and seeds', () => {
  it('leaves the input alone', () => {
    const items = [1, 2, 3, 4];
    shuffle(items, 3);

    expect(items).toEqual([1, 2, 3, 4]);
  });

  it('accepts whole numbers that fit in 32 bits', () => {
    expect(isSeed(0)).toBe(true);
    expect(isSeed(4_294_967_295)).toBe(true);
    expect(isSeed(4_294_967_296)).toBe(false);
    expect(isSeed(1.5)).toBe(false);
    expect(isSeed(-1)).toBe(false);
  });
});
