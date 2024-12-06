import type { HTMLButtonAttributes, HTMLAnchorAttributes } from 'svelte/elements';
import type { ButtonVariants } from './variants';
import type { Snippet } from 'svelte';

export type ButtonProps = Partial<HTMLButtonAttributes> &
	Partial<HTMLAnchorAttributes> &
	ButtonVariants & {
		label?: string;
		icon?: Snippet;
		href?: string;
		loading?: boolean;
		class?: string;
		full?: boolean;
	};
