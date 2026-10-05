import type { IterationEvent } from './simulate';

export type EventStyle = { symbol: string; label: string; cell: string };

/** How each kind of iteration looks on the timeline. Every one has a symbol, not just a color. */
export const eventStyles: Record<IterationEvent, EventStyle> = {
  progress: {
    symbol: '+',
    label: 'Progress',
    cell: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100',
  },
  'no-progress': {
    symbol: '·',
    label: 'No progress',
    cell: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  claim: {
    symbol: 'C',
    label: 'Premature claim, caught by the dual condition',
    cell: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
  },
  'false-claim': {
    symbol: '✗',
    label: 'Premature claim, believed: done (false)',
    cell: 'bg-rose-600 text-white dark:bg-rose-400 dark:text-slate-950',
  },
  throw: {
    symbol: '!',
    label: 'Measurement threw',
    cell: 'bg-orange-500 text-white dark:bg-orange-300 dark:text-slate-950',
  },
  done: {
    symbol: '✓',
    label: 'Done (honest)',
    cell: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950',
  },
  blocked: {
    symbol: 'B',
    label: 'Took the honest way out: BLOCKED',
    cell: 'bg-violet-600 text-white dark:bg-violet-400 dark:text-slate-950',
  },
};

/** The timeline draws at most this many cells. A runaway run says how many more there were. */
export const MAXIMUM_CELLS = 400;

/** How long each iteration stays on screen while the timeline plays. */
export const STEP_MILLISECONDS = 350;
