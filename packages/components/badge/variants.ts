import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(
  [
    'inline-flex',
    'items-center',
    'gap-1',
    'rounded-md',
    'border',
    'border-opacity-50',
    'px-2',
    'py-1',
    'font-medium',
    'text-xs',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-slate-50',
          'text-slate-600',
          'border-slate-400',
          'dark:bg-slate-800',
          'dark:border-slate-700',
          'dark:text-slate-300',
        ],
        success: [
          'bg-green-50',
          'text-green-700',
          'border-green-600',
          'dark:bg-green-800',
          'dark:text-green-300',
        ],
        danger: [
          'bg-red-50',
          'text-red-700',
          'border-red-400',
          'dark:bg-red-800',
          'dark:text-red-300',
        ],
        warning: [
          'bg-yellow-50',
          'text-yellow-800',
          'border-yellow-600',
          'dark:bg-yellow-800',
          'dark:text-yellow-300',
        ],
        information: [
          'bg-blue-50',
          'text-blue-600',
          'border-blue-400',
          'dark:bg-blue-800',
          'dark:text-blue-300',
        ],
        error: [
          'bg-orange-50',
          'text-orange-700',
          'border-orange-600',
          'dark:bg-orange-800',
          'dark:text-orange-300',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeVariants = VariantProps<typeof variants>;
