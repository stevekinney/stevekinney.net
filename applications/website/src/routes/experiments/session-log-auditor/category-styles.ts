/**
 * Colors for categories. A category always carries its label too, so color is
 * never the only way to tell two apart. Class names are written out in full so
 * Tailwind finds them.
 */
export type CategoryStyle = { fill: string; swatch: string };

const known: Record<string, CategoryStyle> = {
  'floor: missing tool': {
    fill: 'fill-amber-500 dark:fill-amber-400',
    swatch: 'bg-amber-500 dark:bg-amber-400',
  },
  'floor: shell option': {
    fill: 'fill-orange-600 dark:fill-orange-400',
    swatch: 'bg-orange-600 dark:bg-orange-400',
  },
  'floor: environment': {
    fill: 'fill-rose-600 dark:fill-rose-400',
    swatch: 'bg-rose-600 dark:bg-rose-400',
  },
  'floor: CLI mismatch': {
    fill: 'fill-fuchsia-600 dark:fill-fuchsia-400',
    swatch: 'bg-fuchsia-600 dark:bg-fuchsia-400',
  },
  'floor: permissions': {
    fill: 'fill-red-800 dark:fill-red-300',
    swatch: 'bg-red-800 dark:bg-red-300',
  },
  'floor or task (ask)': {
    fill: 'fill-sky-600 dark:fill-sky-400',
    swatch: 'bg-sky-600 dark:bg-sky-400',
  },
  harness: {
    fill: 'fill-violet-600 dark:fill-violet-400',
    swatch: 'bg-violet-600 dark:bg-violet-400',
  },
  unclassified: {
    fill: 'fill-slate-400 dark:fill-slate-500',
    swatch: 'bg-slate-400 dark:bg-slate-500',
  },
};

const extra: CategoryStyle[] = [
  { fill: 'fill-teal-600 dark:fill-teal-400', swatch: 'bg-teal-600 dark:bg-teal-400' },
  { fill: 'fill-lime-600 dark:fill-lime-400', swatch: 'bg-lime-600 dark:bg-lime-400' },
  { fill: 'fill-indigo-600 dark:fill-indigo-400', swatch: 'bg-indigo-600 dark:bg-indigo-400' },
  { fill: 'fill-yellow-700 dark:fill-yellow-300', swatch: 'bg-yellow-700 dark:bg-yellow-300' },
  { fill: 'fill-pink-600 dark:fill-pink-400', swatch: 'bg-pink-600 dark:bg-pink-400' },
];

/** The style for a category; a category the person made up gets one by its position. */
export const categoryStyle = (category: string, categories: readonly string[]): CategoryStyle => {
  if (known[category]) return known[category];

  const custom = categories.filter((entry) => !known[entry]);
  const index = Math.max(0, custom.indexOf(category));

  return extra[index % extra.length];
};
