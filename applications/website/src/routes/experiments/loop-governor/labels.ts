import type { GovernorId } from './loop-config';
import type { OutcomeId, StopReason } from './simulate';

export type OutcomeStyle = {
  label: string;
  /** What the outcome means, in a sentence. */
  meaning: string;
  /** Background for bar segments and swatches. */
  fill: string;
  /** SVG fill. */
  svgFill: string;
};

/** Every outcome has a label and a color, and the label always appears beside the color. */
export const outcomeStyles: Record<OutcomeId, OutcomeStyle> = {
  'done-honest': {
    label: 'Done (honest)',
    meaning: 'The work really finished.',
    fill: 'bg-emerald-600 dark:bg-emerald-400',
    svgFill: 'fill-emerald-600 dark:fill-emerald-400',
  },
  'done-false': {
    label: 'Done (false)',
    meaning: 'The loop stopped on a claim of done, and the work wasn’t done.',
    fill: 'bg-rose-600 dark:bg-rose-400',
    svgFill: 'fill-rose-600 dark:fill-rose-400',
  },
  stopped: {
    label: 'Stopped by a governor',
    meaning: 'A governor ended the run before the work finished.',
    fill: 'bg-sky-600 dark:bg-sky-400',
    svgFill: 'fill-sky-600 dark:fill-sky-400',
  },
  broken: {
    label: 'Broken (fail-closed)',
    meaning: 'The measurement threw and the loop stopped instead of guessing.',
    fill: 'bg-amber-500 dark:bg-amber-300',
    svgFill: 'fill-amber-500 dark:fill-amber-300',
  },
  blocked: {
    label: 'Blocked (honest way out)',
    meaning: 'The agent said it couldn’t do the task and asked for a human.',
    fill: 'bg-violet-600 dark:bg-violet-400',
    svgFill: 'fill-violet-600 dark:fill-violet-400',
  },
  runaway: {
    label: 'Runaway',
    meaning: 'Nothing stopped the run, so the simulation cut it off at 2,000 iterations.',
    fill: 'bg-slate-800 dark:bg-slate-200',
    svgFill: 'fill-slate-800 dark:fill-slate-200',
  },
};

export const stopReasonLabels: Record<StopReason, string> = {
  maxIterations: 'Maximum iterations',
  budget: 'Budget',
  stall: 'Stall detector',
  repeatedFailure: 'Repeated failure',
  stopFile: 'Stop file',
};

export const governorLabels: Record<GovernorId | 'stopFile', string> = stopReasonLabels;

export const formatShare = (share: number): string => {
  const percent = share * 100;
  if (percent > 0 && percent < 0.1) return '<0.1%';

  return `${percent.toFixed(1)}%`;
};

export const formatCount = (count: number): string => count.toLocaleString('en-US');

/** A probability for display: `0.35`, `0.884`, `0.0975`. */
export const formatProbability = (value: number): string => String(Number(value.toFixed(4)));
