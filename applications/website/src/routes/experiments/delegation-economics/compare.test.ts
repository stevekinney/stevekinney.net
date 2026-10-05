import { describe, expect, it } from 'vitest';

import { comparePlans } from './compare';
import type { Plan } from './compare';
import { defaultScenario } from './scenario';

const plan = (minutes: number, tokens: number, cost: number): Plan => ({
  scenario: defaultScenario('model'),
  minutes,
  tokens,
  cost,
});

describe('comparePlans', () => {
  it('shows each delta from A to B with a sign and which way it went', () => {
    expect(comparePlans(plan(45, 608_000, 1.376), plan(39.5, 948_000, 2.096))).toEqual([
      { label: 'Wall-clock', a: '45 min', b: '39.5 min', change: '−5.5 min', direction: 'better' },
      { label: 'Tokens', a: '608K', b: '948K', change: '+340K', direction: 'worse' },
      { label: 'Cost', a: '$1.38', b: '$2.10', change: '+$0.72', direction: 'worse' },
    ]);
  });

  it('calls a difference too small to show no change', () => {
    expect(comparePlans(plan(45, 608_000, 1.376), plan(45.01, 608_000, 1.376))).toMatchObject([
      { change: 'no change', direction: 'same' },
      { change: 'no change', direction: 'same' },
      { change: 'no change', direction: 'same' },
    ]);
  });
});
