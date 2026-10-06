import type { MechanismId } from './mechanisms';
import { grade } from './scenarios';
import type { Grade, Scenario } from './scenarios';

/** Seeds are whole numbers that fit in 32 bits, so a link can carry one. */
export const MAXIMUM_SEED = 4_294_967_295;

export const isSeed = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAXIMUM_SEED;

/** Mulberry32: a small, fast generator whose sequence depends only on the seed. */
export const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
};

/** A Fisher–Yates shuffle driven by the seed, so the same seed deals the same order. */
export const shuffle = <Item>(items: readonly Item[], seed: number): Item[] => {
  const random = seededRandom(seed);
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }

  return shuffled;
};

export type GameState = {
  seed: number;
  /** The scenario IDs in this round, in the order they're dealt. */
  order: string[];
  /** Which card in `order` is showing. Equal to `order.length` once the round is over. */
  position: number;
  /** What the learner picked for each card answered this round. */
  picks: Record<string, MechanismId>;
  /** Whether the current card's answer is showing. */
  revealed: boolean;
  /** Whether this round deals only the cards missed last time. */
  retry: boolean;
};

export const startGame = (deck: readonly Scenario[], seed: number): GameState => ({
  seed,
  order: shuffle(
    deck.map((scenario) => scenario.id),
    seed,
  ),
  position: 0,
  picks: {},
  revealed: false,
  retry: false,
});

export const currentId = (state: GameState): string | null => state.order[state.position] ?? null;

export const isFinished = (state: GameState): boolean => state.position >= state.order.length;

/** Records the pick for the card that's showing and reveals the answer. */
export const pick = (state: GameState, mechanism: MechanismId): GameState => {
  const id = currentId(state);
  if (id === null || state.revealed) return state;

  return { ...state, picks: { ...state.picks, [id]: mechanism }, revealed: true };
};

export const advance = (state: GameState): GameState =>
  state.revealed ? { ...state, position: state.position + 1, revealed: false } : state;

const byId = (deck: readonly Scenario[]): Map<string, Scenario> =>
  new Map(deck.map((scenario) => [scenario.id, scenario]));

export type RoundResult = { scenario: Scenario; pick: MechanismId; grade: Grade };

/** Every card answered this round, in the order it was dealt. */
export const results = (state: GameState, deck: readonly Scenario[]): RoundResult[] => {
  const scenarios = byId(deck);

  return state.order.flatMap((id) => {
    const scenario = scenarios.get(id);
    const chosen = state.picks[id];

    return scenario && chosen ? [{ scenario, pick: chosen, grade: grade(scenario, chosen) }] : [];
  });
};

export type Score = { answered: number; matched: number; alternatives: number; missed: number };

export const score = (state: GameState, deck: readonly Scenario[]): Score => {
  const graded = results(state, deck);

  return {
    answered: graded.length,
    matched: graded.filter((result) => result.grade === 'match').length,
    alternatives: graded.filter((result) => result.grade === 'alternative').length,
    missed: graded.filter((result) => result.grade === 'miss').length,
  };
};

/** The cards missed this round, in the order they were dealt. */
export const missedIds = (state: GameState, deck: readonly Scenario[]): string[] =>
  results(state, deck)
    .filter((result) => result.grade === 'miss')
    .map((result) => result.scenario.id);

/** A new round of only the missed cards, in the order they were dealt. */
export const retryMisses = (state: GameState, deck: readonly Scenario[]): GameState => ({
  seed: state.seed,
  order: missedIds(state, deck),
  position: 0,
  picks: {},
  revealed: false,
  retry: true,
});
