<script lang="ts">
	import { variants, type BadgeVariants } from './variants';

	import Count from '../count';
	import type { BaseAttributes, WithIcon } from '../component.types';

	interface Props extends WithIcon, BaseAttributes {
		label?: string;
		count?: number | undefined;
		variant?: BadgeVariants['variant'];
	}

	const {
		label = 'Badge',
		count = undefined,
		variant = 'default',
		icon,
		children,
		...props
	}: Props = $props();
</script>

<div class={variants({ variant })} {...props}>
	{#if icon}
		{@const SvelteComponent = icon}
		<SvelteComponent class="h-3 w-3" />
	{/if}
	{#if children}{@render children()}{:else}{label}{/if}
	{#if count !== undefined}
		<Count {count} {variant} />
	{/if}
</div>
