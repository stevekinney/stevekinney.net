import { describe, expect, it } from 'vitest';

import {
  autoRatio,
  boundaryCoefficient,
  breakEvenContext,
  breakEvenOutput,
  costAtContext,
  evaluateChange,
  netAt,
  perTokenSavings,
  remainingValue,
  switchCost,
  writeMultiplier,
} from './calculate';
import type { ChangeInputs } from './calculate';
import { defaultPricing, findEffort, findModel } from './pricing';

const model = (id: string) => {
  const found = findModel(defaultPricing, id);
  if (!found) throw new Error(`Missing model ${id}`);

  return found;
};

const effort = (id: string) => {
  const found = findEffort(defaultPricing, id);
  if (!found) throw new Error(`Missing effort ${id}`);

  return found;
};

const defaults: ChangeInputs = {
  from: model('opus-5'),
  fromEffort: effort('high'),
  to: model('sonnet-5'),
  toEffort: effort('high'),
  ttl: '1h',
  contextTokens: 500_000,
  remainingOutput: 150_000,
  ratioOverride: null,
};

describe('the formulas', () => {
  it('multiplies cache writes by 2 for one hour and 1.25 for five minutes', () => {
    expect(writeMultiplier('1h')).toBe(2);
    expect(writeMultiplier('5m')).toBe(1.25);
  });

  it('prices a re-cache at the destination input rate', () => {
    expect(switchCost(500_000, model('sonnet-5'), '1h')).toBeCloseTo(2, 10);
    expect(switchCost(500_000, model('sonnet-5'), '5m')).toBeCloseTo(1.25, 10);
    expect(switchCost(0, model('sonnet-5'), '1h')).toBe(0);
  });

  it('divides the destination effort by the starting effort', () => {
    expect(autoRatio(effort('high'), effort('medium'))).toBe(0.5);
    expect(autoRatio(effort('medium'), effort('high'))).toBe(2);
    expect(autoRatio(effort('high'), effort('high'))).toBe(1);
  });

  it('measures per-token savings from the output prices', () => {
    expect(perTokenSavings(model('opus-5'), model('sonnet-5'), 1)).toBeCloseTo(15e-6, 12);
    expect(remainingValue(150_000, model('opus-5'), model('sonnet-5'), 1)).toBeCloseTo(2.25, 10);
  });

  it('returns no break-even when the change never saves anything', () => {
    expect(breakEvenContext(150_000, model('sonnet-5'), model('opus-5'), 1, '1h')).toBeNull();
    expect(breakEvenOutput(500_000, model('sonnet-5'), model('opus-5'), 1, '1h')).toBeNull();
    expect(breakEvenContext(150_000, model('opus-5'), model('opus-5'), 1, '1h')).toBeNull();
  });
});

describe('the specification’s acceptance checks', () => {
  it('1. defaults: $2.00 cost, $2.25 value, +$0.25 net, $15 per MTok, break-evens', () => {
    const result = evaluateChange(defaults);

    expect(result.cost).toBeCloseTo(2, 10);
    expect(result.value).toBeCloseTo(2.25, 10);
    expect(result.net).toBeCloseTo(0.25, 10);
    expect(result.savingsPerMillion).toBe(15);
    expect(result.breakEvenContext).toBeCloseTo(562_500, 4);
    expect(result.breakEvenOutput).toBeCloseTo(133_333.33, 1);
    expect(result.verdict).toBe('worth-it');
    expect(result.cachePreserving).toBe(false);
  });

  it('2. five-minute cache: $1.25 cost and +$1.00 net', () => {
    const result = evaluateChange({ ...defaults, ttl: '5m' });

    expect(result.cost).toBeCloseTo(1.25, 10);
    expect(result.net).toBeCloseTo(1, 10);
  });

  it('3. effort only: ratio 0.5, $5.00 cost, $1.875 value, break-even output 400,000', () => {
    const result = evaluateChange({ ...defaults, to: model('opus-5'), toEffort: effort('medium') });

    expect(result.ratio).toBe(0.5);
    expect(result.cost).toBeCloseTo(5, 10);
    expect(result.value).toBeCloseTo(1.875, 10);
    expect(result.breakEvenOutput).toBeCloseTo(400_000, 4);
    expect(result.breakEvenOutput! - defaults.remainingOutput).toBeCloseTo(250_000, 4);
    expect(result.verdict).toBe('not-yet');
    expect(result.cachePreserving).toBe(true);
  });

  it('4. an upgrade saves nothing: −$15 per MTok and no break-even', () => {
    const result = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });

    expect(result.savingsPerMillion).toBe(-15);
    expect(result.verdict).toBe('never');
    expect(result.breakEvenContext).toBeNull();
    expect(result.breakEvenOutput).toBeNull();
  });

  it('5. nothing changed: no cost and the unchanged verdict', () => {
    const result = evaluateChange({ ...defaults, to: model('opus-5') });

    expect(result.cost).toBe(0);
    expect(result.value).toBe(0);
    expect(result.net).toBe(0);
    expect(result.unchanged).toBe(true);
    expect(result.verdict).toBe('unchanged');
  });
});

describe('edge cases', () => {
  it('treats a change that saves exactly nothing as never paying back', () => {
    const result = evaluateChange({ ...defaults, to: model('opus-5'), ratioOverride: 1 });

    expect(result.unchanged).toBe(false);
    expect(result.savingsPerMillion).toBe(0);
    expect(result.verdict).toBe('never');
    expect(result.cost).toBeCloseTo(5, 10);
  });

  it('counts a ratio override on the same model and effort as a change', () => {
    const result = evaluateChange({ ...defaults, to: model('opus-5'), ratioOverride: 0.4 });

    expect(result.unchanged).toBe(false);
    expect(result.overridden).toBe(true);
    expect(result.ratio).toBe(0.4);
    expect(result.cachePreserving).toBe(false);
  });

  it('pays back at zero context and zero remaining work without dividing by zero', () => {
    const empty = evaluateChange({ ...defaults, contextTokens: 0 });
    expect(empty.cost).toBe(0);
    expect(empty.verdict).toBe('worth-it');
    expect(empty.breakEvenOutput).toBe(0);

    const idle = evaluateChange({ ...defaults, remainingOutput: 0 });
    expect(idle.value).toBe(0);
    expect(idle.verdict).toBe('not-yet');
    expect(idle.breakEvenContext).toBe(0);
  });

  it('never runs out of context headroom when the destination input is free', () => {
    const free = { ...model('sonnet-5'), id: 'free', input: 0 };
    const result = evaluateChange({ ...defaults, to: free });

    expect(result.cost).toBe(0);
    expect(result.breakEvenContext).toBe(Number.POSITIVE_INFINITY);
  });

  it('treats a break-even exactly at the current context as paying back', () => {
    const atBreakEven = evaluateChange({ ...defaults, contextTokens: 562_500 });

    expect(atBreakEven.verdict).toBe('worth-it');
  });

  it('shows what the chart and map need at any point', () => {
    const result = evaluateChange(defaults);

    expect(costAtContext(result, 250_000)).toBeCloseTo(1, 10);
    expect(netAt(result, 500_000, 150_000)).toBeCloseTo(result.net, 10);
    expect(netAt(result, 1_000_000, 1_000)).toBeLessThan(0);
  });

  it('states the boundary as a multiple of context', () => {
    expect(boundaryCoefficient(evaluateChange(defaults))).toBeCloseTo(4 / 15, 10);
    expect(
      boundaryCoefficient(
        evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') }),
      ),
    ).toBeNull();
    expect(boundaryCoefficient(evaluateChange({ ...defaults, to: model('opus-5') }))).toBeNull();
  });
});
