import type { Classification } from './lint-rules';

/** Colors for each classification. Every one also carries its text label. */
export const classificationClasses: Record<Classification, string> = {
  'must-hold':
    'bg-red-100 text-red-900 ring-red-300 dark:bg-red-900/40 dark:text-red-100 dark:ring-red-700',
  deterministic:
    'bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-900/40 dark:text-violet-100 dark:ring-violet-700',
  'stale-prone':
    'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700',
  'skill-candidate':
    'bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-100 dark:ring-sky-700',
  vague:
    'bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:ring-orange-700',
  pointer:
    'bg-teal-100 text-teal-900 ring-teal-300 dark:bg-teal-900/40 dark:text-teal-100 dark:ring-teal-700',
  'good-fact':
    'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700',
  unknown:
    'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
  'no-match':
    'bg-slate-100 text-slate-800 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
};

/** Rungs that only ask are drawn in one family, rungs that refuse in another. */
export const rungTone = (refuses: boolean): string =>
  refuses ? 'border-emerald-600 dark:border-emerald-400' : 'border-amber-500 dark:border-amber-400';
