import { describe, expect, it } from 'vitest';

import { evaluateChange } from './calculate';
import type { ChangeInputs } from './calculate';
import {
  breakEvenPoint,
  buildLayout,
  chartDomain,
  contextAtX,
  costLinePoints,
  describeCursor,
  xOf,
  xTicks,
  yOf,
  yTicks,
  COST_SAMPLES,
} from './chart-geometry';
import { defaultPricing, findEffort, findModel } from './pricing';

const model = (id: string) => findModel(defaultPricing, id)!;
const effort = (id: string) => findEffort(defaultPricing, id)!;

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

const evaluation = evaluateChange(defaults);

describe('chartDomain', () => {
  it('runs to 1.3 times the larger of N and the break-even', () => {
    expect(chartDomain(evaluation)).toBeCloseTo(562_500 * 1.3, 4);
    expect(chartDomain(evaluateChange({ ...defaults, contextTokens: 900_000 }))).toBeCloseTo(
      900_000 * 1.3,
      4,
    );
  });

  it('never shows less than 50K', () => {
    expect(
      chartDomain(evaluateChange({ ...defaults, contextTokens: 1_000, remainingOutput: 100 })),
    ).toBe(50_000);
  });

  it('grows with very large contexts', () => {
    expect(chartDomain(evaluateChange({ ...defaults, contextTokens: 50_000_000 }))).toBe(
      65_000_000,
    );
  });

  it('ignores a break-even that does not exist or is unbounded', () => {
    const never = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });
    const free = evaluateChange({
      ...defaults,
      to: { ...model('sonnet-5'), id: 'free', input: 0 },
    });

    expect(chartDomain(never)).toBeCloseTo(650_000, 4);
    expect(chartDomain(free)).toBeCloseTo(650_000, 4);
  });
});

describe('the layout', () => {
  const layout = buildLayout(evaluation, 640, 340);

  it('leaves headroom above the higher line', () => {
    const costTop = (chartDomain(evaluation) * 2 * 2) / 1e6;

    expect(layout.yRange.max).toBeCloseTo(Math.max(costTop, 2.25) * 1.15, 6);
    expect(layout.yRange.min).toBe(0);
  });

  it('extends below zero when the change has a negative value', () => {
    const upgrade = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });
    const upgradeLayout = buildLayout(upgrade, 640, 340);

    expect(upgradeLayout.yRange.min).toBeCloseTo(upgrade.value * 1.15, 6);
    expect(yOf(upgradeLayout, upgrade.value)).toBeLessThan(
      upgradeLayout.margins.top + upgradeLayout.plotHeight,
    );
  });

  it('draws a flat zero line when nothing changes', () => {
    const idle = evaluateChange({ ...defaults, to: model('opus-5') });
    const idleLayout = buildLayout(idle, 640, 340);

    expect(idleLayout.yRange).toEqual({ min: 0, max: 1 });
  });

  it('maps contexts to the plot and back, in whole thousands', () => {
    expect(xOf(layout, 0)).toBe(layout.margins.left);
    expect(xOf(layout, layout.domainMax)).toBeCloseTo(layout.margins.left + layout.plotWidth, 6);
    expect(contextAtX(layout, xOf(layout, 300_000))).toBe(300_000);
    expect(contextAtX(layout, -50)).toBe(0);
    expect(contextAtX(layout, 10_000)).toBe(Math.round(layout.domainMax / 1000) * 1000);
  });

  it('has five ticks on each axis and 41 cost samples', () => {
    expect(xTicks(layout)).toHaveLength(5);
    expect(yTicks(layout)).toHaveLength(5);
    expect(xTicks(layout)[0].label).toBe('0');
    expect(costLinePoints(evaluation, layout)).toHaveLength(COST_SAMPLES);
  });

  it('puts the break-even where the lines cross', () => {
    const point = breakEvenPoint(evaluation, layout);

    expect(point?.context).toBeCloseTo(562_500, 4);
    expect(point?.y).toBeCloseTo(yOf(layout, 2.25), 6);
  });

  it('has no break-even marker for an upgrade', () => {
    const upgrade = evaluateChange({ ...defaults, from: model('sonnet-5'), to: model('opus-5') });

    expect(breakEvenPoint(upgrade, buildLayout(upgrade, 640, 340))).toBeNull();
  });
});

describe('describeCursor', () => {
  it('reads like the specification’s tooltip', () => {
    expect(describeCursor(evaluateChange({ ...defaults, to: model('sonnet-5') }), 312_000)).toBe(
      '312K tokens in context · Cost to change $1.25',
    );
  });
});
