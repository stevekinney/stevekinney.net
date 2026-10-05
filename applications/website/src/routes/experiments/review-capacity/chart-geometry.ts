/**
 * Rounds a chart's largest value up to a tidy axis top, such as 1.5, 3, or 6
 * times a power of ten, so the gridlines at each quarter land on readable numbers.
 */
export const niceMaximum = (largest: number): number => {
  if (!(largest > 0)) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(largest));
  const step =
    [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((candidate) => candidate * magnitude >= largest) ?? 10;

  return step * magnitude;
};

/** Five gridlines, evenly spaced from zero to the top. */
export const gridValues = (maximum: number): number[] =>
  Array.from({ length: 5 }, (_, index) => (maximum * index) / 4);

/**
 * Which category labels fit under the axis: every one when there's room, or
 * every second, third, and so on, always keeping the first and the last.
 */
export const visibleLabels = (
  count: number,
  plotWidth: number,
  labelWidth: number,
): Set<number> => {
  const every = Math.max(1, Math.ceil((labelWidth * count) / Math.max(1, plotWidth)));
  const shown = new Set<number>();
  if (count === 0) return shown;

  const last = count - 1;
  // A label too close to the last one gives way to it.
  for (let index = 0; index < last; index += every) {
    if (last - index >= every) shown.add(index);
  }
  shown.add(last);

  return shown;
};

/** Axis labels short enough for a phone: `900`, `1.2K`, `12K`, or `1.5M`. */
export const formatAxisNumber = (value: number): string => {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toPrecision(3))}M`;
  if (value >= 1_000) return `${Number((value / 1_000).toPrecision(3))}K`;

  return String(Number(value.toPrecision(3)));
};
