import {
  type Icon,
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ClipboardList,
  Flame,
  HelpCircle,
  Info,
  List,
  Pencil,
  Quote,
  X,
  Zap,
} from 'lucide-svelte';
import type { ComponentType } from 'svelte';

/**
 * All possible callout variations supported by the component.
 */
export const variations = [
  'abstract',
  'attention',
  'bug',
  'caution',
  'check',
  'cite',
  'danger',
  'done',
  'error',
  'example',
  'fail',
  'failure',
  'faq',
  'help',
  'hint',
  'important',
  'info',
  'information',
  'missing',
  'note',
  'question',
  'quote',
  'success',
  'summary',
  'tip',
  'tldr',
  'todo',
  'warning',
] as const;

/**
 * Type representing all possible callout variations.
 */
export type CalloutVariation = (typeof variations)[number];

/**
 * Base callout types that have direct styling and icons.
 */
export type BaseCalloutVariation =
  | 'abstract'
  | 'bug'
  | 'danger'
  | 'example'
  | 'failure'
  | 'info'
  | 'note'
  | 'question'
  | 'quote'
  | 'success'
  | 'tip'
  | 'todo'
  | 'warning';

/**
 * Mapping of alias variations to their base variations.
 */
const variationAliases: Record<
  Exclude<CalloutVariation, BaseCalloutVariation>,
  BaseCalloutVariation
> = {
  attention: 'warning',
  caution: 'warning',
  check: 'success',
  cite: 'quote',
  done: 'success',
  error: 'danger',
  fail: 'failure',
  faq: 'question',
  help: 'question',
  hint: 'tip',
  important: 'tip',
  information: 'info',
  missing: 'failure',
  summary: 'abstract',
  tldr: 'abstract',
};

/**
 * Checks if a variant is an alias that should be mapped to a base variant.
 * @param variant - The callout variant to check.
 * @returns True if the variant is an alias.
 */
const isAlias = (variant: CalloutVariation): variant is keyof typeof variationAliases => {
  return variant in variationAliases;
};

/**
 * Maps a variant (including aliases) to its base variant for styling and icons.
 * @param variant - The callout variant to convert.
 * @returns The base variant for styling purposes.
 */
export const getVariation = (variant: CalloutVariation): BaseCalloutVariation => {
  if (isAlias(variant)) {
    return variationAliases[variant];
  }
  return variant as BaseCalloutVariation;
};

/**
 * CSS classes for each base callout variation.
 */
const variationColors: Record<BaseCalloutVariation, string> = {
  abstract:
    'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  bug: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  danger:
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  example:
    'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-50 dark:border-purple-900',
  failure:
    'bg-red-50 text-red-700 border-red-100 dark:bg-red-950 dark:text-red-50 dark:border-red-900',
  info: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  note: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  question:
    'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-50 dark:border-orange-900',
  quote:
    'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-900',
  success:
    'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  tip: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-50 dark:border-green-900',
  todo: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-50 dark:border-blue-900',
  warning:
    'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-50 dark:border-orange-900',
};

/**
 * Gets the CSS classes for a given callout variation.
 * @param variation - The callout variation.
 * @returns The CSS classes for styling the callout.
 */
export const getVariationColor = (variation: CalloutVariation): string => {
  const baseVariation = getVariation(variation);
  return variationColors[baseVariation];
};

/**
 * Icon components for each base callout variation.
 */
const variationIcons: Record<BaseCalloutVariation, ComponentType<Icon>> = {
  abstract: ClipboardList,
  bug: Bug,
  danger: Zap,
  example: List,
  failure: X,
  info: Info,
  note: Pencil,
  question: HelpCircle,
  quote: Quote,
  success: Check,
  tip: Flame,
  todo: CheckCircle2,
  warning: AlertTriangle,
};

/**
 * Gets the appropriate icon component for a callout variation.
 * @param variation - The callout variation.
 * @returns The icon component to use.
 */
export const getIcon = (variation: CalloutVariation): ComponentType<Icon> => {
  const baseVariation = getVariation(variation);
  return variationIcons[baseVariation];
};
