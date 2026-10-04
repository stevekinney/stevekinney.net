import type { ModelValue } from './models';

/**
 * Tier colors are one hue, getting darker as the tier gets pricier. The
 * ring keeps the lightest and darkest swatches visible against either theme,
 * and an unrecognized model gets stripes instead of a shade, because it has
 * no tier. Model names are always shown as text beside a swatch.
 */
const swatchBase = 'ring-1 ring-inset ring-slate-900/20 dark:ring-white/30';

export const swatchClasses = (model: ModelValue): string => {
  switch (model) {
    case 'haiku':
      return `${swatchBase} bg-primary-200 text-primary-950 dark:bg-primary-300`;
    case 'sonnet':
      return `${swatchBase} bg-primary-400 text-primary-950`;
    case 'opus':
      return `${swatchBase} bg-primary-600 text-white`;
    case 'fable':
      return `${swatchBase} bg-primary-900 text-white dark:bg-primary-800`;
    default:
      return `${swatchBase} bg-slate-200 text-slate-900 bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(15_23_42/0.18)_5px_8px)] dark:bg-slate-600 dark:text-white dark:bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgb(255_255_255/0.22)_5px_8px)]`;
  }
};

/** The tier legend, cheapest first. */
export const legend: { model: ModelValue; tier: string }[] = [
  { model: 'haiku', tier: 'Tier 1, cheapest' },
  { model: 'sonnet', tier: 'Tier 2' },
  { model: 'opus', tier: 'Tier 3' },
  { model: 'fable', tier: 'Tier 4, most expensive' },
  { model: 'unrecognized', tier: 'No tier, price unknown' },
];
