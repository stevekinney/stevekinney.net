import { formatMultiplier, formatPercent } from './display';
import type { Scenario } from './scenario';
import { modeLabel } from './scenario';

/**
 * Reads a speedup guess such as `2`, `2x`, `1.5×`, or `2.5 times`. Returns null
 * for anything that isn't a positive number up to 1,000.
 */
export const parseGuess = (text: string): number | null => {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/,/g, '.')
    .replace(/\s*(x|×|times)$/, '');
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);

  return value > 0 && value <= 1_000 ? value : null;
};

export type PredictionResult = {
  guess: number;
  actual: number;
  /** Guess minus answer: positive when the guess was too optimistic. */
  gap: number;
  sentence: string;
};

/** Close enough to call it right: the two agree to two decimals. */
const CLOSE = 0.005;

export const comparePrediction = (guess: number, actual: number): PredictionResult => {
  const gap = guess - actual;
  const answer = `You guessed ${formatMultiplier(guess)}. The answer is ${formatMultiplier(actual)}`;
  const size = Number(Math.abs(gap).toFixed(2));

  let sentence: string;
  if (Math.abs(gap) < CLOSE) sentence = `${answer}. Spot on.`;
  else if (gap > 0) sentence = `${answer}, so your guess was ${size} too high.`;
  else sentence = `${answer}, so your guess was ${size} too low.`;

  return { guess, actual, gap, sentence };
};

/** The scenario in plain words, such as “60 minutes of work, 40% of it serial, 4 workers.” */
export const describeScenario = (scenario: Scenario): string => {
  const minutes = Number(scenario.soloMinutes.toFixed(1));
  const workers =
    scenario.mode === 'subagents'
      ? `${scenario.workers} ${scenario.workers === 1 ? 'worker' : 'workers'}`
      : `${scenario.workers} ${scenario.workers === 1 ? 'teammate' : 'teammates'} (${modeLabel(scenario.mode).toLowerCase()})`;

  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} of work, ${formatPercent(scenario.serialFraction)} of it serial, ${workers}.`;
};
