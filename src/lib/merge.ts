import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export const merge = (...inputs: string[]) => {
  return twMerge(clsx(...inputs));
};
