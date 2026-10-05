import { describe, expect, it } from 'vitest';

import {
  defaultState,
  describeRatioSource,
  evaluateState,
  normalizeState,
  parseRatioOverride,
  swapState,
} from './calculator-state';
import { defaultPricing } from './pricing';

describe('swapState', () => {
  it('exchanges model and effort on both sides and clears the override', () => {
    const swapped = swapState({ ...defaultState, toEffort: 'medium', ratioOverride: 0.3 });

    expect(swapped).toMatchObject({
      fromModel: 'sonnet-5',
      fromEffort: 'medium',
      toModel: 'opus-5',
      toEffort: 'high',
      ratioOverride: null,
    });
  });

  it('restores the defaults when swapped twice', () => {
    expect(swapState(swapState(defaultState))).toEqual(defaultState);
  });
});

describe('parseRatioOverride', () => {
  it('reads positive numbers, including zero', () => {
    expect(parseRatioOverride('0.5')).toBe(0.5);
    expect(parseRatioOverride(' 2 ')).toBe(2);
    expect(parseRatioOverride('.75')).toBe(0.75);
    expect(parseRatioOverride('0')).toBe(0);
  });

  it('treats empty, negative, and unreadable text as no override', () => {
    expect(parseRatioOverride('')).toBeNull();
    expect(parseRatioOverride('-0.5')).toBeNull();
    expect(parseRatioOverride('half')).toBeNull();
    expect(parseRatioOverride('1.2.3')).toBeNull();
  });
});

describe('normalizeState', () => {
  it('falls back for models and efforts the table does not have', () => {
    const state = normalizeState(
      {
        ...defaultState,
        fromModel: 'gone',
        toModel: 'also-gone',
        fromEffort: 'nope',
        toEffort: 'nope',
      },
      defaultPricing,
    );

    expect(state).toMatchObject({
      fromModel: 'opus-5',
      toModel: 'sonnet-5',
      fromEffort: 'high',
      toEffort: 'high',
    });
  });

  it('uses the first model when even the defaults are gone', () => {
    const table = { ...defaultPricing, models: [defaultPricing.models[4]] };

    expect(normalizeState(defaultState, table)).toMatchObject({
      fromModel: 'haiku-4-5',
      toModel: 'haiku-4-5',
    });
  });
});

describe('evaluateState', () => {
  it('evaluates the defaults', () => {
    expect(evaluateState(defaultState, defaultPricing).net).toBeCloseTo(0.25, 10);
  });
});

describe('describeRatioSource', () => {
  const source = (overrides: Partial<typeof defaultState>) =>
    describeRatioSource(evaluateState({ ...defaultState, ...overrides }, defaultPricing));

  it('picks the note from the efforts and the override', () => {
    expect(source({})).toBe('same');
    expect(source({ toEffort: 'medium' })).toBe('published');
    expect(source({ toEffort: 'xhigh' })).toBe('placeholder');
    expect(source({ fromEffort: 'max' })).toBe('placeholder');
    expect(source({ ratioOverride: 0.4 })).toBe('override');
  });
});
