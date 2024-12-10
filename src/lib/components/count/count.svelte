<script lang="ts">
	import { twMerge as merge } from 'tailwind-merge';
	import type { ExtendElement } from '../component.types';
	import { variants, type CountVariants } from './variants';

	type Props = ExtendElement<
		'span',
		CountVariants & {
			count: number;
		}
	>;

	const { count, variant = 'default', class: className, ...props }: Props = $props();
</script>

<span class={merge(variants({ variant }), className)} {...props}>
	{count}
</span>
