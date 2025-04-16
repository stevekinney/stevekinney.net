import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(['rounded-full', 'px-2'], {
  variants: {
    variant: {
      default: [
        'text-slate-50',
        'bg-slate-600',
        'dark:bg-slate-800',
        'dark:border-slate-700',
        'dark:text-slate-300',
      ],
      success: ['text-green-50', 'bg-green-700', 'dark:bg-green-800', 'dark:text-green-300'],
      primary: ['text-primary-50', 'bg-primary-700', 'dark:bg-green-800', 'dark:text-green-300'],
      danger: ['text-red-50', 'bg-red-700', 'dark:bg-red-800', 'dark:text-red-300'],
      warning: ['text-yellow-50', 'bg-yellow-800', 'dark:bg-yellow-800', 'dark:text-yellow-300'],
      information: ['text-blue-50', 'bg-blue-600', 'dark:bg-blue-800', 'dark:text-blue-300'],
      error: ['text-orange-50', 'bg-orange-700', 'dark:bg-orange-800', 'dark:text-orange-300'],
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export type CountVariants = VariantProps<typeof variants>;
