/**
 * Colors for the chart series. Color is never the only signal: a hatched
 * series also carries diagonal lines, and every series is named in a legend
 * and in the chart's table.
 */
export type Tone = 'primary' | 'amber' | 'rose' | 'slate';

export const toneFill: Record<Tone, string> = {
  primary: 'fill-primary-600 dark:fill-primary-400',
  amber: 'fill-amber-500 dark:fill-amber-400',
  rose: 'fill-rose-600 dark:fill-rose-400',
  slate: 'fill-slate-400 dark:fill-slate-500',
};

export const toneSwatch: Record<Tone, string> = {
  primary: 'bg-primary-600 dark:bg-primary-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  rose: 'bg-rose-600 dark:bg-rose-400',
  slate: 'bg-slate-400 dark:bg-slate-500',
};

/** Diagonal stripes drawn over a swatch, matching the chart's hatch pattern. */
export const hatchSwatch =
  'bg-[repeating-linear-gradient(45deg,transparent_0,transparent_3px,rgb(255_255_255/0.7)_3px,rgb(255_255_255/0.7)_5px)] dark:bg-[repeating-linear-gradient(45deg,transparent_0,transparent_3px,rgb(15_23_42/0.7)_3px,rgb(15_23_42/0.7)_5px)]';
