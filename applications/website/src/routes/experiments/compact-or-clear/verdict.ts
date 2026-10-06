import { formatCost } from '$lib/experiments/format';

import type { Projection, StrategyId } from './projection';

const TIE_TOLERANCE = 1e-9;

const turnWord = (count: number): string => (count === 1 ? 'turn' : 'turns');

/** The cheapest strategy after the last turn. A tie goes to doing less. */
export const cheapest = (projection: Projection): StrategyId => {
  const order: StrategyId[] = ['keep', 'compact', 'switch'];
  let best: StrategyId = 'keep';
  let bestCost = Infinity;

  for (const strategy of order) {
    const total = projection[strategy]?.at(-1);
    if (total !== undefined && total < bestCost - TIE_TOLERANCE) {
      best = strategy;
      bestCost = total;
    }
  }

  return best;
};

/** The answer in one sentence: which strategy is cheapest over the turns ahead, and by how much. */
export const verdictSentence = (
  projection: Projection,
  turns: number,
  switchName: string | null,
): string => {
  const phrases: Record<StrategyId, string> = {
    keep: 'keep going',
    compact: 'compact now',
    switch: `switch to ${switchName ?? 'the other model'}`,
  };
  const best = cheapest(projection);
  const others = (['keep', 'compact', 'switch'] as const).flatMap((strategy) => {
    const total = projection[strategy]?.at(-1);

    return strategy === best || total === undefined
      ? []
      : [`${formatCost(total)} to ${phrases[strategy]}`];
  });

  return `Over the next ${turns} ${turnWord(turns)}, ${phrases[best]}: it comes to ${formatCost(
    projection[best]?.at(-1) ?? 0,
  )}, against ${others.join(' and ')}.`;
};

/** `pays for itself after 6 turns`, with a note when that's past the turns ahead. */
export const paybackPhrase = (payback: number | null, turns: number, horizon: number): string => {
  if (payback === null) return `doesn’t pay for itself within ${horizon} turns`;
  if (payback === 0) return 'is cheaper from the start';

  const after = `pays for itself after ${payback} ${turnWord(payback)}`;

  return payback > turns ? `${after}, more than the ${turns} you have left` : after;
};
