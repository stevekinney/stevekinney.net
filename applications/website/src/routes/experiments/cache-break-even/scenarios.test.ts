import { describe, expect, it } from 'vitest';

import { defaultState } from './calculator-state';
import { defaultPricing } from './pricing';
import {
  MAX_SCENARIOS,
  STORAGE_KEY,
  addScenario,
  browserStorage,
  compareScenarios,
  loadScenarios,
  storeScenarios,
} from './scenarios';

const memoryStorage = (initial?: string) => {
  let value: string | null = initial ?? null;

  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    peek: () => value,
  };
};

let counter = 0;
const makeId = () => `id-${counter++}`;

describe('addScenario', () => {
  it('adds a scenario under a name', () => {
    const scenarios = addScenario([], '  Heavy refactor  ', defaultState, makeId);

    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe('Heavy refactor');
    expect(scenarios[0].state).toEqual(defaultState);
  });

  it('replaces a scenario saved under the same name', () => {
    const first = addScenario([], 'A', defaultState, makeId);
    const second = addScenario(first, 'A', { ...defaultState, contextTokens: 1 }, makeId);

    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
    expect(second[0].state.contextTokens).toBe(1);
  });

  it('names an unnamed scenario and keeps only the newest twenty', () => {
    expect(addScenario([], '   ', defaultState, makeId)[0].name).toBe('Untitled scenario');

    let scenarios = addScenario([], 'first', defaultState, makeId);
    for (let index = 0; index < MAX_SCENARIOS; index += 1) {
      scenarios = addScenario(scenarios, `scenario ${index}`, defaultState, makeId);
    }

    expect(scenarios).toHaveLength(MAX_SCENARIOS);
    expect(scenarios.some((scenario) => scenario.name === 'first')).toBe(false);
  });
});

describe('storage', () => {
  it('round-trips scenarios', () => {
    const storage = memoryStorage();
    const scenarios = addScenario([], 'A', defaultState, makeId);

    expect(storeScenarios(storage, scenarios)).toBe(true);
    expect(loadScenarios(storage)).toEqual(scenarios);
  });

  it('ignores damaged storage instead of failing', () => {
    expect(loadScenarios(memoryStorage('not json'))).toEqual([]);
    expect(loadScenarios(memoryStorage('{"a":1}'))).toEqual([]);
    expect(
      loadScenarios(
        memoryStorage(
          JSON.stringify([
            { id: 'ok', name: 'ok', state: defaultState },
            { id: 'bad', name: 'bad', state: { ...defaultState, ttl: 'weekly' } },
            null,
          ]),
        ),
      ),
    ).toHaveLength(1);
  });

  it('survives storage that is missing or throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(loadScenarios(undefined)).toEqual([]);
    expect(loadScenarios(throwing)).toEqual([]);
    expect(storeScenarios(undefined, [])).toBe(false);
    expect(storeScenarios(throwing, [])).toBe(false);
    expect(STORAGE_KEY).toBeTruthy();
    expect(typeof browserStorage).toBe('function');
  });
});

describe('compareScenarios', () => {
  it('evaluates each scenario against the current prices', () => {
    const scenarios = addScenario(
      addScenario([], 'defaults', defaultState, makeId),
      'five-minute',
      { ...defaultState, ttl: '5m' },
      makeId,
    );
    const [first, second] = compareScenarios(scenarios, defaultPricing);

    expect(first.evaluation.cost).toBeCloseTo(2, 10);
    expect(second.evaluation.cost).toBeCloseTo(1.25, 10);
  });

  it('copes with a model that has been removed from the table', () => {
    const scenarios = addScenario([], 'gone', { ...defaultState, toModel: 'removed' }, makeId);

    expect(() => compareScenarios(scenarios, defaultPricing)).not.toThrow();
  });
});
