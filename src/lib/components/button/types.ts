import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
import type { Icon } from 'lucide-svelte';
import type { ButtonVariants } from './variants';

export type ButtonProps = Partial<HTMLButtonAttributes> &
	Partial<HTMLAnchorAttributes> &
	ButtonVariants & {
		label?: string;
		icon?: typeof Icon;
		href?: string;
		loading?: boolean;
		class?: string;
		full?: boolean;
	};
