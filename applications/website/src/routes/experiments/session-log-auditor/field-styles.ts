export const headingClasses = 'text-xl font-bold text-slate-900 dark:text-white';

export const bodyClasses = 'text-sm text-slate-600 dark:text-slate-300';

export const codeClasses =
  'rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-slate-800';

export const buttonClasses =
  'focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

export const linkButtonClasses =
  'focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60';

/** A wide table scrolls inside this, never the page. `relative` keeps `sr-only` children inside it. */
export const tableRegionClasses =
  'focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700';

export const tableClasses = 'w-full min-w-max text-left text-sm tabular-nums';

export const headCellClasses =
  'bg-slate-50 px-3 py-2 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200';

export const cellClasses =
  'border-t border-slate-200 px-3 py-2 text-slate-700 dark:border-slate-700 dark:text-slate-200';

/** Untrusted text with no spaces, such as a file name, a path, or a model ID, wraps anywhere. */
export const wrapAnywhere = '[overflow-wrap:anywhere]';
