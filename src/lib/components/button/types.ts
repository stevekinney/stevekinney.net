import type { ComponentType } from 'svelte';
import type { ButtonVariants } from './variants';
import type { Icon } from 'lucide-svelte';

export type ButtonProps = Partial<HTMLButtonElement> &
	Partial<HTMLAnchorElement> &
	ButtonVariants & {
		label?: string;
		icon?: ComponentType<Icon>;
		href?: string;
		loading?: boolean;
		class?: string;
	};
