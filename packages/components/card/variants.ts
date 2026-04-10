import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(['rounded-md', 'shadow-md', 'p-6'], {
  variants: {
    variant: {
      default: ['bg-slate-100 dark:bg-slate-800'],
      primary: ['bg-primary-100 dark:bg-primary-800'],
      success: ['bg-green-100 dark:bg-green-800'],
      danger: ['bg-red-100 dark:bg-red-800'],
      warning: ['bg-yellow-100 dark:bg-yellow-800'],
      information: ['bg-blue-100 dark:bg-blue-800'],
      error: ['bg-orange-100 dark:bg-orange-800'],
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type CardVariants = VariantProps<typeof variants>;
