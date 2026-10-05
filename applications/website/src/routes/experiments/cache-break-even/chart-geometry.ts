import { costAtContext } from './calculate';
import type { ChangeEvaluation } from './calculate';
import { formatDollars, formatTokens } from './display';

/** The chart's x axis never shows less than this many tokens. */
export const MIN_DOMAIN = 50_000;

/** Samples along the cost line. */
export const COST_SAMPLES = 41;

/** The x axis runs from zero to this much beyond the larger of N and the break-even. */
const DOMAIN_HEADROOM = 1.3;

/** The y axis leaves this much room above the highest line. */
const VALUE_HEADROOM = 1.15;

export const GRIDLINES = 5;

/** The right end of the x axis. */
export const chartDomain = (evaluation: ChangeEvaluation): number => {
  const breakEven = evaluation.breakEvenContext;
  const finiteBreakEven = breakEven !== null && Number.isFinite(breakEven) ? breakEven : 0;

  return Math.max(
    MIN_DOMAIN,
    Math.max(evaluation.contextTokens, finiteBreakEven) * DOMAIN_HEADROOM,
  );
};

export type YRange = { min: number; max: number };

/**
 * The dollars the y axis covers. It starts at zero and leaves headroom above
 * the higher of the cost line and the value. A change that costs more per
 * token has a negative value, so the axis reaches below zero to show it.
 */
export const chartYRange = (evaluation: ChangeEvaluation, domainMax: number): YRange => {
  const costTop = costAtContext(evaluation, domainMax);
  const top = Math.max(costTop, evaluation.value) * VALUE_HEADROOM;
  const bottom = Math.min(0, evaluation.value) * VALUE_HEADROOM;
  if (top > 0) return { min: bottom, max: top };
  // Nothing above zero to show: leave a sliver of room above the axis, or a dollar when there are no lines at all.
  return { min: bottom, max: bottom < 0 ? -bottom * 0.1 : 1 };
};

export type ChartMargins = { top: number; right: number; bottom: number; left: number };

export type ChartLayout = {
  width: number;
  height: number;
  margins: ChartMargins;
  plotWidth: number;
  plotHeight: number;
  domainMax: number;
  yRange: YRange;
};

export const buildLayout = (
  evaluation: ChangeEvaluation,
  width: number,
  height: number,
): ChartLayout => {
  const domainMax = chartDomain(evaluation);
  const yRange = chartYRange(evaluation, domainMax);
  const margins: ChartMargins = {
    top: 22,
    right: width < 480 ? 14 : 24,
    bottom: 56,
    left: width < 480 ? 56 : 66,
  };

  return {
    width,
    height,
    margins,
    plotWidth: Math.max(1, width - margins.left - margins.right),
    plotHeight: Math.max(1, height - margins.top - margins.bottom),
    domainMax,
    yRange,
  };
};

export const xOf = (layout: ChartLayout, contextTokens: number): number =>
  layout.margins.left + (contextTokens / layout.domainMax) * layout.plotWidth;

export const yOf = (layout: ChartLayout, dollars: number): number => {
  const { min, max } = layout.yRange;

  return layout.margins.top + (1 - (dollars - min) / (max - min)) * layout.plotHeight;
};

/** The context a horizontal position inside the chart stands for, rounded to the nearest 1,000 tokens. */
export const contextAtX = (layout: ChartLayout, x: number): number => {
  const fraction = Math.min(1, Math.max(0, (x - layout.margins.left) / layout.plotWidth));

  return Math.round((fraction * layout.domainMax) / 1_000) * 1_000;
};

/** Five labels from zero to the end of the axis. */
export const xTicks = (layout: ChartLayout): { value: number; x: number; label: string }[] =>
  Array.from({ length: GRIDLINES }, (_, index) => {
    const value = (layout.domainMax * index) / (GRIDLINES - 1);

    return { value, x: xOf(layout, value), label: formatTokens(value) };
  });

/** Five gridlines from the bottom of the axis to the top. */
export const yTicks = (layout: ChartLayout): { value: number; y: number; label: string }[] =>
  Array.from({ length: GRIDLINES }, (_, index) => {
    const { min, max } = layout.yRange;
    const value = min + ((max - min) * index) / (GRIDLINES - 1);

    return {
      value,
      y: yOf(layout, value),
      label: value < -1e-9 ? `−${formatDollars(value)}` : formatDollars(value),
    };
  });

/** The cost line, sampled at 41 evenly spaced contexts. */
export const costLinePoints = (
  evaluation: ChangeEvaluation,
  layout: ChartLayout,
): { x: number; y: number }[] =>
  Array.from({ length: COST_SAMPLES }, (_, index) => {
    const context = (layout.domainMax * index) / (COST_SAMPLES - 1);

    return { x: xOf(layout, context), y: yOf(layout, costAtContext(evaluation, context)) };
  });

export const toPath = (points: readonly { x: number; y: number }[]): string =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

/** The break-even point, or `null` when the lines never cross inside the chart. */
export const breakEvenPoint = (
  evaluation: ChangeEvaluation,
  layout: ChartLayout,
): { context: number; x: number; y: number } | null => {
  const context = evaluation.breakEvenContext;
  if (context === null || !Number.isFinite(context) || context > layout.domainMax) return null;
  if (evaluation.value < 0) return null;

  return { context, x: xOf(layout, context), y: yOf(layout, evaluation.value) };
};

/** The words a hover or keyboard cursor shows at a context. */
export const describeCursor = (evaluation: ChangeEvaluation, contextTokens: number): string =>
  `${formatTokens(contextTokens)} tokens in context · Cost to change ${formatDollars(
    costAtContext(evaluation, contextTokens),
  )}`;

/** How far an arrow key moves the keyboard cursor: about one percent of the axis, in whole thousands. */
export const cursorStep = (layout: ChartLayout): number =>
  Math.max(1_000, Math.round(layout.domainMax / 100 / 1_000) * 1_000);

export const clampContext = (layout: ChartLayout, context: number): number =>
  Math.min(layout.domainMax, Math.max(0, context));
