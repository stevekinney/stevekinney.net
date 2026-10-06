import type { CurvePoint } from './economics';
import { MAXIMUM_WORKERS } from './economics';

/** Worker counts that get a tick on the x axis. */
export const X_TICKS = [1, 4, 8, 12, 16, 20, 24, 28, 32] as const;

/**
 * The top of the y axis: the largest speedup on either curve with 10%
 * headroom, raised to take in the ceiling when it's close enough to be worth
 * drawing. A ceiling far above the curves, such as 100× at 1% serial, would
 * flatten them, so it's left off and named in words instead.
 */
export const speedupAxis = (
  curve: readonly CurvePoint[],
  ceiling: number | null,
): { maximum: number; showsCeiling: boolean } => {
  const largest = Math.max(
    1,
    ...curve.map((point) => point.ideal),
    ...curve.map((point) => point.speedup ?? 0),
  );
  const showsCeiling = ceiling !== null && ceiling <= largest * 1.5;
  const top = showsCeiling ? Math.max(largest, ceiling) : largest;

  return { maximum: niceCeiling(top * 1.1), showsCeiling };
};

/** Rounds up to a value that reads well on an axis: 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, and so on. */
export const niceCeiling = (value: number): number => {
  if (!Number.isFinite(value) || value <= 1) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((candidate) => candidate * magnitude >= value - 1e-9) ?? 10;

  return step * magnitude;
};

/** Five gridlines from zero to the top. */
export const gridValues = (maximum: number): number[] =>
  Array.from({ length: 5 }, (_, index) => (maximum * index) / 4);

/** Axis labels: `0×`, `1.25×`, `2.5×`, `10×`. */
export const formatAxisMultiplier = (value: number): string =>
  `${Number(value.toFixed(value >= 10 ? 0 : 2))}×`;

/** The worker count under a horizontal position, held to 1–32. */
export const workersAt = (offset: number, plotLeft: number, plotWidth: number): number => {
  const position = (offset - plotLeft) / Math.max(1, plotWidth);
  const workers = Math.round(1 + position * (MAXIMUM_WORKERS - 1));

  return Math.min(MAXIMUM_WORKERS, Math.max(1, workers));
};
