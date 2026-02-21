import clsx, { type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges class names with Tailwind's class merging strategy.
 * Supports conditional class names and null/undefined values.
 *
 * @param inputs - Class values to merge (strings, objects, arrays, null, undefined)
 * @returns Merged class string
 */
export const merge = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
