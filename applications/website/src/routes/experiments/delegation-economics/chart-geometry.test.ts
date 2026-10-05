import { describe, expect, it } from 'vitest';

import {
  formatAxisMultiplier,
  niceCeiling,
  placeTooltip,
  speedupAxis,
  workersAt,
} from './chart-geometry';
import { speedupCurve } from './economics';
import type { EconomicsInputs } from './economics';

const inputs: EconomicsInputs = {
  soloMinutes: 60,
  serialFraction: 0.4,
  workers: 4,
  integrationMinutes: 3,
  spawnTokens: 20_000,
  sharedTokens: 50_000,
  uniqueTokens: 300_000,
  outputTokens: 5_000,
  reportTokens: 2_000,
  sharedPrefix: false,
  mode: 'subagents',
  teamMultiplier: 3.5,
  planMultiplier: 7,
  prices: { input: 2, cachedInput: 0.2, output: 10 },
};

describe('speedupAxis', () => {
  it('makes room for the 2.5× ceiling at the defaults', () => {
    expect(speedupAxis(speedupCurve(inputs), 2.5)).toEqual({ maximum: 3, showsCeiling: true });
  });

  it('leaves a ceiling far above the curves off the chart', () => {
    const curve = speedupCurve({ ...inputs, serialFraction: 0.01 });

    expect(speedupAxis(curve, 100).showsCeiling).toBe(false);
  });

  it('copes with no serial work and with no work at all', () => {
    expect(speedupAxis(speedupCurve({ ...inputs, serialFraction: 0 }), null).maximum).toBe(40);
    expect(
      speedupAxis(speedupCurve({ ...inputs, soloMinutes: 0, integrationMinutes: 0 }), 2.5).maximum,
    ).toBe(3);
  });
});

describe('niceCeiling', () => {
  it('rounds up to a readable step', () => {
    expect(niceCeiling(2.75)).toBe(3);
    expect(niceCeiling(35.2)).toBe(40);
    expect(niceCeiling(0.4)).toBe(1);
  });
});

describe('workersAt', () => {
  it('maps a pointer position to a whole worker count from 1 to 32', () => {
    expect(workersAt(40, 40, 310)).toBe(1);
    expect(workersAt(350, 40, 310)).toBe(32);
    expect(workersAt(40 + 30, 40, 310)).toBe(4);
    expect(workersAt(-100, 40, 310)).toBe(1);
    expect(workersAt(10_000, 40, 310)).toBe(32);
  });
});

describe('placeTooltip', () => {
  it('sits right of the anchor when it fits, else left, and never outside the bounds', () => {
    expect(placeTooltip(100, 150, 0, 360)).toBe(110);
    expect(placeTooltip(300, 150, 0, 360)).toBe(140);
    // On a narrow chart, a tooltip with no room on either side is held inside it.
    expect(placeTooltip(180, 200, 0, 300)).toBe(0);
    expect(placeTooltip(180, 200, 40, 300)).toBe(40);
    expect(placeTooltip(5, 400, 0, 300)).toBe(0);
  });
});

describe('formatAxisMultiplier', () => {
  it('keeps axis labels short', () => {
    expect(formatAxisMultiplier(0)).toBe('0×');
    expect(formatAxisMultiplier(0.75)).toBe('0.75×');
    expect(formatAxisMultiplier(12.5)).toBe('13×');
  });
});
