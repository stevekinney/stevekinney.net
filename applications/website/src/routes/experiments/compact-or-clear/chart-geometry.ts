/** Every how many turns the x axis gets a tick. */
export const tickStep = (turns: number): number => {
  if (turns <= 12) return 2;
  if (turns <= 30) return 5;
  if (turns <= 60) return 10;

  return 20;
};

export const xTicks = (turns: number): number[] => {
  const step = tickStep(turns);
  const ticks: number[] = [];

  for (let turn = 0; turn <= turns; turn += step) ticks.push(turn);

  return ticks;
};

/** The top of the y axis: the largest value plus 8% headroom. */
export const yAxisMaximum = (largest: number): number => (largest > 0 ? largest * 1.08 : 1);

/** Five gridlines, evenly spaced from zero to the top. */
export const GRIDLINE_COUNT = 5;

export const gridValues = (maximum: number): number[] =>
  Array.from({ length: GRIDLINE_COUNT }, (_, index) => (maximum * index) / (GRIDLINE_COUNT - 1));

/**
 * Spreads labels so their centers sit at least `gap` apart, staying inside
 * `[minimum, maximum]` and keeping their order. Returns positions in the order
 * given.
 */
export const nudgeApart = (
  positions: readonly number[],
  gap: number,
  minimum: number,
  maximum: number,
): number[] => {
  const order = positions.map((_, index) => index).sort((a, b) => positions[a] - positions[b]);
  const placed = order.map((index) => Math.min(maximum, Math.max(minimum, positions[index])));

  for (let slot = 1; slot < placed.length; slot += 1) {
    placed[slot] = Math.max(placed[slot], placed[slot - 1] + gap);
  }

  // Pushing down can run past the bottom, so push back up from there.
  for (let slot = placed.length - 1; slot >= 0; slot -= 1) {
    const ceiling = slot === placed.length - 1 ? maximum : placed[slot + 1] - gap;
    placed[slot] = Math.min(placed[slot], ceiling);
  }

  const result = new Array<number>(positions.length);
  order.forEach((index, slot) => {
    result[index] = placed[slot];
  });

  return result;
};

/** Axis labels: `$0`, `$2.78`, `$27.80`, or `$278`, whichever keeps them short. */
export const formatAxisDollars = (value: number): string => {
  if (value >= 100) return `$${Math.round(value)}`;
  if (value >= 10) return `$${value.toFixed(1).replace(/\.0$/, '')}`;

  return value === 0 ? '$0' : `$${value.toFixed(2)}`;
};
