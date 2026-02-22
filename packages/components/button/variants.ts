import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(
  [
    'font-semibold',
    'border',
    'rounded',
    'shadow-sm',
    'inline-flex',
    'items-center',
    'justify-center',
    'cursor-pointer',
    'gap-1.5',
    'focus-visible:outline',
    'focus-visible:outline-2',
    'focus-visible:outline-offset-2',
    'transition-colors',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-600',
          'text-white',
          'border-transparent',
          'hover:bg-primary-700',
          'active:bg-primary-800',
          'disabled:hover:bg-primary-600',
          'disabled:active:bg-primary-600',
        ],
        secondary: [
          'bg-white',
          'text-gray-800',
          'border-slate-400',
          'hover:bg-slate-100',
          'active:bg-slate-200',
          'disabled:hover:bg-white',
          'disabled:active:bg-white',
          'dark:bg-slate-800',
          'dark:hover:bg-slate-700',
          'dark:text-white',
          'dark:disabled:hover:bg-slate-800',
        ],
        destructive: [
          'bg-red-600',
          'text-white',
          'border-transparent',
          'hover:bg-red-700',
          'active:bg-red-800',
          'disabled:hover:bg-red-600',
          'disabled:active:bg-red-600',
        ],
        ghost: [
          'bg-transparent',
          'text-primary-700',
          'border-transparent',
          'shadow-none',
          'hover:bg-slate-100',
          'active:bg-slate-200',
          'disabled:hover:bg-transparent',
          'disabled:active:bg-transparent',
          'dark:text-primary-500',
          'dark:hover:bg-slate-800',
        ],
      },
      size: {
        small: ['text-sm', 'px-2', 'py-1'],
        medium: ['text-sm', 'px-2.5', 'py-1.5'],
        large: ['text-sm', 'px-3', 'py-2'],
      },
      iconPosition: {
        left: ['flex-row'],
        right: ['flex-row-reverse'],
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'medium',
      iconPosition: 'left',
    },
  },
);

export type ButtonVariants = VariantProps<typeof variants>;
