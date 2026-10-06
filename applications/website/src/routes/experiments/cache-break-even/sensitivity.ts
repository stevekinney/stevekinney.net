import { boundaryCoefficient, netAt } from './calculate';
import type { ChangeEvaluation } from './calculate';
import { formatDollars } from './display';

/** The map covers 1K to 10M tokens on both axes, on a log scale. */
export const MAP_MIN = 1_000;
export const MAP_MAX = 10_000_000;

export const MAP_COLUMNS = 48;
export const MAP_ROWS = 32;

/** The net, in dollars, at which a cell is as strong as it gets. */
const SATURATION_DOLLARS = 100;

/** Where a value falls along a log axis from `MAP_MIN` to `MAP_MAX`: 0 at the start and 1 at the end. */
export const logPosition = (value: number): number =>
  Math.min(
    1,
    Math.max(0, Math.log10(Math.max(value, MAP_MIN) / MAP_MIN) / Math.log10(MAP_MAX / MAP_MIN)),
  );

/** The inverse of `logPosition`. */
export const valueAtLogPosition = (position: number): number =>
  MAP_MIN * Math.pow(MAP_MAX / MAP_MIN, Math.min(1, Math.max(0, position)));

/** Rounds to three significant digits, so a click lands on `312,000` and not `311,874`. */
export const roundToSignificantDigits = (value: number, digits = 3): number => {
  if (value <= 0) return 0;

  const scale = Math.pow(10, Math.floor(Math.log10(value)) - digits + 1);

  return Math.round(value / scale) * scale;
};

export type MapCell = {
  column: number;
  /** Row 0 is the top of the map, where remaining work is highest. */
  row: number;
  contextTokens: number;
  remainingOutput: number;
  net: number;
};

/** The center of a cell, as counts. */
export const cellCenter = (column: number, row: number): { context: number; output: number } => ({
  context: valueAtLogPosition((column + 0.5) / MAP_COLUMNS),
  output: valueAtLogPosition(1 - (row + 0.5) / MAP_ROWS),
});

export const buildMapCells = (evaluation: ChangeEvaluation): MapCell[] => {
  const cells: MapCell[] = [];

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let column = 0; column < MAP_COLUMNS; column += 1) {
      const { context, output } = cellCenter(column, row);

      cells.push({
        column,
        row,
        contextTokens: context,
        remainingOutput: output,
        net: netAt(evaluation, context, output),
      });
    }
  }

  return cells;
};

/**
 * How strongly to color a cell, from 0 for a net of zero to 1 at $100 or more
 * either way. Nets span many orders of magnitude, so the scale is logarithmic.
 */
export const cellIntensity = (net: number): number => {
  const magnitude = Math.abs(net);
  if (magnitude < 1e-9) return 0;

  return Math.min(1, Math.log10(1 + magnitude * 100) / Math.log10(1 + SATURATION_DOLLARS * 100));
};

/** The boundary where the change breaks even, as two ends in counts, or `null` when none is on the map. */
export const boundarySegment = (
  evaluation: ChangeEvaluation,
): {
  from: { context: number; output: number };
  to: { context: number; output: number };
} | null => {
  const coefficient = boundaryCoefficient(evaluation);
  if (coefficient === null || coefficient === 0) return null;

  // Remaining output equals the coefficient times context along the boundary.
  const lowContext = Math.max(MAP_MIN, MAP_MIN / coefficient);
  const highContext = Math.min(MAP_MAX, MAP_MAX / coefficient);
  if (lowContext >= highContext) return null;

  return {
    from: { context: lowContext, output: lowContext * coefficient },
    to: { context: highContext, output: highContext * coefficient },
  };
};

const formatCoefficient = (coefficient: number): string => {
  if (coefficient >= 100) return String(Math.round(coefficient));
  if (coefficient >= 10) return coefficient.toFixed(1);
  if (coefficient >= 0.01) return coefficient.toFixed(2);

  return coefficient.toPrecision(2);
};

/** The map's boundary in words, for anyone who can't see it. */
export const describeBoundary = (evaluation: ChangeEvaluation): string => {
  if (evaluation.unchanged) return 'Nothing is changing, so there is nothing to pay back.';

  const coefficient = boundaryCoefficient(evaluation);
  if (coefficient === null) {
    return 'This change never pays back, at any context or amount of remaining work.';
  }

  return `Pays back whenever R ≥ ${formatCoefficient(coefficient)} × N.`;
};

/** What hovering or focusing a cell says. */
export const describeCell = (
  context: number,
  output: number,
  net: number,
  format: (tokens: number) => string,
): string => {
  const standing = Math.abs(net) < 1e-9 ? 'break even' : net > 0 ? 'ahead' : 'behind';
  const sign = net < 0 && Math.abs(net) >= 1e-9 ? '−' : '+';

  return `N ${format(context)} · R ${format(output)} · Net ${sign}${formatDollars(net)} (${standing})`;
};
