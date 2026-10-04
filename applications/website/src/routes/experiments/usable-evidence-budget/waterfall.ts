import {
  capacityDescription,
  capacityName,
  findTerm,
  formatDraw,
  formatPercent,
  formatTokens,
  percentOf,
  termKeys,
  terms,
  usable,
  usableDescription,
  usableName,
} from './budget';
import type { Scenario, TermKey } from './budget';

export const chartWidth = 640;
export const chartHeight = 392;

const plot = { left: 56, right: 628, top: 30, bottom: 326 };

export type ColumnKey = 'capacity' | TermKey | 'usable';

/** Breaks a name into lines of about `width` characters, with an ellipsis if it needs more than `maximumLines`. */
export const wrapLabel = (name: string, width = 13, maximumLines = 3): string[] => {
  const lines: string[] = [];
  let line = '';

  for (const word of name.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;

    if (line && candidate.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  if (lines.length <= maximumLines) return lines;

  const kept = lines.slice(0, maximumLines);
  kept[maximumLines - 1] = `${kept[maximumLines - 1].slice(0, Math.max(width - 1, 1))}…`;

  return kept;
};

export type Axis = {
  min: number;
  max: number;
  /** The gridlines. Without negative room these are five lines from zero to the capacity. */
  ticks: { value: number; y: number; label: string }[];
  /** Where zero falls, drawn heavier when the axis goes below it. */
  zeroY: number;
  hasNegative: boolean;
  y: (value: number) => number;
};

const MAXIMUM_NEGATIVE_STEPS = 8;

/**
 * An axis from the capacity down to whatever the chart reaches below zero.
 * Gridlines sit every quarter of the capacity, so a window with nothing below
 * zero has exactly five. Below zero, the same spacing continues, and widens
 * only when a term is so large that the gridlines would crowd the chart.
 */
export const buildAxis = (max: number, lowest: number): Axis => {
  let step = max / 4;
  let negativeSteps = lowest < 0 ? Math.ceil(-lowest / step - 1e-9) : 0;

  while (negativeSteps > MAXIMUM_NEGATIVE_STEPS) {
    step *= 2;
    negativeSteps = Math.ceil(-lowest / step - 1e-9);
  }

  const min = negativeSteps === 0 ? 0 : -negativeSteps * step;
  const span = max - min;
  const y = (value: number): number => plot.top + ((max - value) / span) * (plot.bottom - plot.top);

  const values: number[] = [];
  for (let index = -negativeSteps; index * step <= max + 1e-9; index += 1)
    values.push(index * step + 0);
  if (values.at(-1) !== max) values.push(max);

  return {
    min,
    max,
    ticks: values.map((value) => ({ value, y: y(value), label: formatTokens(value) })),
    zeroY: y(0),
    hasNegative: negativeSteps > 0,
    y,
  };
};

export type Rect = { x: number; y: number; width: number; height: number };

export type Column = {
  key: ColumnKey;
  name: string;
  lines: string[];
  /** The label above the bar, such as `1M`, `−18K`, or `810K`. */
  valueLabel: string;
  valueLabelY: number;
  /** Where the bar sits, in tokens. */
  high: number;
  low: number;
  rect: Rect;
  center: number;
  /** The usable bar, when nothing is left. */
  over: boolean;
};

export type Waterfall = {
  axis: Axis;
  columns: Column[];
  /** Dashed lines from one bar's lower edge to the next bar's top. */
  connectors: { x1: number; x2: number; y: number }[];
  /** The pinned scenario's bars, drawn as outlines behind the current ones. */
  ghosts: Rect[] | null;
  /** The part of the evidence that fits, inside the usable bar. */
  evidenceFit: Rect | null;
  /** The part of the evidence past zero, drawn in the warning color. */
  evidenceOverflow: Rect | null;
  labelY: number;
};

type Span = { key: ColumnKey; name: string; high: number; low: number; label: string };

const spansOf = (scenario: Scenario): Span[] => {
  const left = usable(scenario);
  let running = scenario.capacity;

  return [
    {
      key: 'capacity',
      name: capacityName,
      high: scenario.capacity,
      low: 0,
      label: formatTokens(scenario.capacity),
    },
    ...terms.map((term) => {
      const high = running;
      running -= scenario[term.key];

      return {
        key: term.key,
        name: term.name,
        high,
        low: running,
        label: formatDraw(scenario[term.key]),
      };
    }),
    {
      key: 'usable',
      name: usableName,
      high: Math.max(left, 0),
      low: Math.min(left, 0),
      label: formatTokens(left),
    },
  ];
};

const lowestPoint = (scenario: Scenario, evidenceOverflow: number): number => {
  const left = usable(scenario);

  return Math.min(0, left) - evidenceOverflow;
};

/**
 * Splits evidence into the part that fits inside the usable bar and the part
 * past it. When nothing is usable, all of it is past the bar.
 */
export const splitEvidence = (
  evidence: number,
  usableTokens: number,
): { fitted: number; overflow: number } => {
  const fitted = Math.min(Math.max(evidence, 0), Math.max(usableTokens, 0));

  return { fitted, overflow: Math.max(evidence, 0) - fitted };
};

/** Lays the chart out in a `chartWidth` by `chartHeight` box. */
export const layoutWaterfall = (
  scenario: Scenario,
  ghost: Scenario | null,
  evidence: number | null,
): Waterfall => {
  const split = splitEvidence(evidence ?? 0, usable(scenario));
  const max = Math.max(scenario.capacity, ghost?.capacity ?? 0);
  const lowest = Math.min(lowestPoint(scenario, split.overflow), ghost ? lowestPoint(ghost, 0) : 0);
  const axis = buildAxis(max, lowest);

  const slot = (plot.right - plot.left) / 7;
  const barWidth = slot * 0.62;
  const barX = (index: number): number => plot.left + slot * index + (slot - barWidth) / 2;

  const rectFor = (index: number, high: number, low: number): Rect => {
    const top = axis.y(high);
    const height = Math.max(axis.y(low) - top, 2);

    return {
      x: barX(index),
      y: height === 2 && high === low ? top - 1 : top,
      width: barWidth,
      height,
    };
  };

  const columns: Column[] = spansOf(scenario).map((span, index) => {
    const rect = rectFor(index, span.high, span.low);

    return {
      key: span.key,
      name: span.name,
      lines: wrapLabel(span.name),
      valueLabel: span.label,
      valueLabelY: rect.y - 6,
      high: span.high,
      low: span.low,
      rect,
      center: rect.x + barWidth / 2,
      over: span.key === 'usable' && usable(scenario) <= 0,
    };
  });

  const levels = [scenario.capacity];
  let running = scenario.capacity;
  for (const key of termKeys) {
    running -= scenario[key];
    levels.push(running);
  }

  const connectors = levels.map((level, index) => ({
    x1: barX(index) + barWidth,
    x2: barX(index + 1),
    y: axis.y(level),
  }));

  const usableIndex = 6;
  const left = usable(scenario);
  const evidenceFit =
    split.fitted > 0
      ? {
          x: barX(usableIndex),
          y: axis.y(split.fitted),
          width: barWidth,
          height: axis.y(0) - axis.y(split.fitted),
        }
      : null;
  const overflowTop = Math.min(0, left);
  const evidenceOverflow =
    split.overflow > 0
      ? {
          x: barX(usableIndex),
          y: axis.y(overflowTop),
          width: barWidth,
          height: axis.y(overflowTop - split.overflow) - axis.y(overflowTop),
        }
      : null;

  return {
    axis,
    columns,
    connectors,
    ghosts: ghost ? spansOf(ghost).map((span, index) => rectFor(index, span.high, span.low)) : null,
    evidenceFit,
    evidenceOverflow,
    labelY: plot.bottom + (axis.hasNegative ? 20 : 18),
  };
};

export type ColumnDetail = {
  title: string;
  value: string;
  share: string;
  description: string;
};

/** What the tooltip says about a column: its name, value, share of the window, and meaning. */
export const describeColumn = (key: ColumnKey, scenario: Scenario): ColumnDetail => {
  const share = (amount: number): string =>
    `${formatPercent(percentOf(amount, scenario.capacity))} of the window`;

  if (key === 'capacity') {
    return {
      title: capacityName,
      value: formatTokens(scenario.capacity),
      share: share(scenario.capacity),
      description: capacityDescription,
    };
  }

  if (key === 'usable') {
    const left = usable(scenario);

    return {
      title: usableName,
      value: formatTokens(left),
      share: share(left),
      description: usableDescription,
    };
  }

  const term = findTerm(key);

  return {
    title: term.name,
    value: formatTokens(scenario[key]),
    share: share(scenario[key]),
    description: term.description,
  };
};
