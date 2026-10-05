/** A step of 1, 2, or 5 times a power of ten that splits `span` into about `count` parts. */
export const niceStep = (span: number, count = 5): number => {
  if (!(span > 0) || !Number.isFinite(span)) return 1;

  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;

  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * power;
};

/** An axis domain that covers every value (and zero, if asked), widened to whole steps. */
export const niceDomain = (
  values: readonly number[],
  { includeZero = false, count = 5 }: { includeZero?: boolean; count?: number } = {},
): { min: number; max: number; step: number } => {
  const finite = values.filter(Number.isFinite);
  let low = finite.length > 0 ? Math.min(...finite) : 0;
  let high = finite.length > 0 ? Math.max(...finite) : 1;

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

/**
 * Which values to draw when there are too many to show one dot each: evenly
 * spaced through the sorted values, so the spread on screen matches the data.
 * Returns indices into `values`.
 */
export const thin = (values: readonly number[], limit: number): number[] => {
  const order = values.map((_, index) => index);
  if (values.length <= limit) return order;

  order.sort((first, second) => values[first] - values[second]);
  const picked: number[] = [];
  for (let slot = 0; slot < limit; slot += 1) {
    picked.push(order[Math.round((slot * (values.length - 1)) / (limit - 1))]);
  }

  return picked;
};

/** A steady vertical offset from −1 to 1 for the n-th dot, so equal values don't hide each other. */
export const jitter = (index: number): number => ((index * 0.618_033_988_75) % 1) * 2 - 1;
