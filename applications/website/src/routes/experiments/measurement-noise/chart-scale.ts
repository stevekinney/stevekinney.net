/** A step of 1, 2, or 5 times a power of ten that splits `span` into about `count` parts. */
export const niceStep = (span: number, count = 5): number => {
  if (!(span > 0) || !Number.isFinite(span)) return 1;

  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;

  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
};

/**
 * The smallest and largest finite values, or `null` with none. One pass, not
 * `Math.min(...values)`: spreading 100,000 or so arguments overflows the stack.
 */
const bounds = (values: readonly number[]): { low: number; high: number } | null => {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }

  return low <= high ? { low, high } : null;
};

/** An axis domain that covers every value (and zero, if asked), widened to whole steps. */
export const niceDomain = (
  values: readonly number[],
  { includeZero = false, count = 5 }: { includeZero?: boolean; count?: number } = {},
): { min: number; max: number; step: number } => {
  let { low, high } = bounds(values) ?? { low: 0, high: 1 };

  if (includeZero) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (low === high) {
    low -= 1;
    high += 1;
  }

  const step = niceStep(high - low, count);

  return { min: Math.floor(low / step) * step, max: Math.ceil(high / step) * step, step };
};

/** Every tick from `min` to `max` at `step`, without floating-point drift. */
export const ticks = (min: number, max: number, step: number): number[] => {
  const result: number[] = [];
  const count = Math.round((max - min) / step);
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));

  for (let index = 0; index <= count; index += 1) {
    result.push(Number((min + index * step).toFixed(decimals)));
  }

  return result;
};

/** Maps a value in [min, max] to a position in [start, end]. */
export const scale =
  (min: number, max: number, start: number, end: number) =>
  (value: number): number =>
    max === min ? (start + end) / 2 : start + ((value - min) / (max - min)) * (end - start);

/** A steady vertical offset from −1 to 1 for the n-th dot, so equal values don't hide each other. */
export const jitter = (index: number): number => ((index * 0.618_033_988_75) % 1) * 2 - 1;
