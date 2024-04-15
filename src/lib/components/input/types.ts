import type { ComponentType } from 'svelte';
import type { Icon } from 'lucide-svelte';

type Props = {
	label: string;
	/** Help text to be displayed below the input */
	details?: string;
	/** Hide label and use it as a placeholder */
	unlabeled?: boolean;
	before?: ComponentType<Icon>;
	after?: ComponentType<Icon>;
	prefix?: string;
	suffix?: string;
};

export type InputProps = Omit<Partial<HTMLInputElement>, keyof Props> & Props;
