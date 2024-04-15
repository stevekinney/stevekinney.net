import { cva, type VariantProps } from 'class-variance-authority';

export const variants = cva(['rounded-md', 'shadow-md', 'p-6'], {
	variants: {
		variant: {
			default: ['bg-slate-100'],
			primary: ['bg-primary-100'],
			success: ['bg-green-100'],
			danger: ['bg-red-100'],
			warning: ['bg-yellow-100'],
			information: ['bg-blue-100'],
			error: ['bg-orange-100'],
		},
	},
	defaultVariants: {
		variant: 'default',
	},
});

export type CardVariants = VariantProps<typeof variants>;
