import { formatCompactTokenCount as formatTokens, formatCost } from '$lib/experiments/format';

import { formatMinutes } from './display';
import type { Evaluation } from './economics';
import type { Scenario } from './scenario';

/** A pinned plan: the scenario it came from and the three numbers it produced. */
export type Plan = {
  scenario: Scenario;
  minutes: number;
  tokens: number;
  cost: number;
};

export const toPlan = (scenario: Scenario, evaluation: Evaluation): Plan => ({
  scenario: { ...scenario },
  minutes: evaluation.fanMinutes,
  tokens: evaluation.fan.total,
  cost: evaluation.fanCost,
});

export type ComparisonRow = {
  label: string;
  a: string;
  b: string;
  /** B minus A, signed, such as `−5.5 min`, `+120K`, or `no change`. */
  change: string;
  /** Whether B is better, worse, or the same as A. Lower is better for all three. */
  direction: 'better' | 'worse' | 'same';
};

const MINUS = '−';

const signed = (difference: number, format: (value: number) => string): string =>
  `${difference < 0 ? MINUS : '+'}${format(Math.abs(difference))}`;

const row = (
  label: string,
  a: number,
  b: number,
  format: (value: number) => string,
): ComparisonRow => {
  const difference = b - a;
  // Compare what's shown, so a difference too small to print reads as no change.
  const same = format(Math.abs(difference)) === format(0);

  return {
    label,
    a: format(a),
    b: format(b),
    change: same ? 'no change' : signed(difference, format),
    direction: same ? 'same' : difference < 0 ? 'better' : 'worse',
  };
};

/** Plan A against plan B for time, tokens, and cost. */
export const comparePlans = (a: Plan, b: Plan): ComparisonRow[] => [
  row('Wall-clock', a.minutes, b.minutes, formatMinutes),
  row('Tokens', a.tokens, b.tokens, formatTokens),
  row('Cost', a.cost, b.cost, formatCost),
];
