import type { StrategyId } from './projection';

type StrategyStyle = {
  name: string;
  /** The name when the chart is too narrow for the full one. */
  shortName: string;
  stroke: string;
  fill: string;
  text: string;
  swatch: string;
  dash: string | undefined;
};

/**
 * Each strategy's name and colors. Blue, orange, green, and pink hold their
 * contrast against both the light and the dark background. The names carry
 * the meaning, so color is never the only signal: lines are labeled at their
 * ends and the table names the best strategy in words.
 */
export const strategyStyles: Record<StrategyId, StrategyStyle> = {
  keep: {
    name: 'Keep going',
    shortName: 'Keep',
    stroke: 'stroke-blue-600 dark:stroke-blue-400',
    fill: 'fill-blue-600 dark:fill-blue-400',
    text: 'fill-blue-700 dark:fill-blue-300',
    swatch: 'bg-blue-600 dark:bg-blue-400',
    dash: undefined,
  },
  compact: {
    name: 'Compact now',
    shortName: 'Compact',
    stroke: 'stroke-orange-600 dark:stroke-orange-400',
    fill: 'fill-orange-600 dark:fill-orange-400',
    text: 'fill-orange-700 dark:fill-orange-300',
    swatch: 'bg-orange-600 dark:bg-orange-400',
    dash: undefined,
  },
  clear: {
    name: 'Clear now',
    shortName: 'Clear',
    stroke: 'stroke-green-700 dark:stroke-green-400',
    fill: 'fill-green-700 dark:fill-green-400',
    text: 'fill-green-800 dark:fill-green-300',
    swatch: 'bg-green-700 dark:bg-green-400',
    dash: undefined,
  },
  later: {
    name: 'Compact later',
    shortName: 'Later',
    stroke: 'stroke-pink-600 dark:stroke-pink-400',
    fill: 'fill-pink-600 dark:fill-pink-400',
    text: 'fill-pink-700 dark:fill-pink-300',
    swatch: 'bg-pink-600 dark:bg-pink-400',
    dash: '7 4',
  },
};
