/**
 * How each stage is drawn. Color alone never tells stages apart: each one also
 * has its own fill pattern and its label.
 */
export type StageStyle = {
  /** Tailwind fill and stroke classes for the bar. */
  fill: string;
  /** A swatch for legends and table cells. */
  swatch: string;
  /** The pattern drawn over the bar, described for the legend. */
  pattern: 'solid' | 'stripes' | 'dots' | 'crosshatch';
  patternName: string;
};

export const stageStyles: StageStyle[] = [
  {
    fill: 'fill-sky-600 dark:fill-sky-400',
    swatch: 'bg-sky-600 dark:bg-sky-400',
    pattern: 'solid',
    patternName: 'solid',
  },
  {
    fill: 'fill-amber-500 dark:fill-amber-300',
    swatch: 'bg-amber-500 dark:bg-amber-300',
    pattern: 'stripes',
    patternName: 'striped',
  },
  {
    fill: 'fill-emerald-600 dark:fill-emerald-400',
    swatch: 'bg-emerald-600 dark:bg-emerald-400',
    pattern: 'dots',
    patternName: 'dotted',
  },
  {
    fill: 'fill-fuchsia-600 dark:fill-fuchsia-400',
    swatch: 'bg-fuchsia-600 dark:bg-fuchsia-400',
    pattern: 'crosshatch',
    patternName: 'cross-hatched',
  },
];

export const stageStyle = (stage: number): StageStyle => stageStyles[stage % stageStyles.length];
