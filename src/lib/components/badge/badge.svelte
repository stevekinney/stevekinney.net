<script lang="ts">
	import type { Icon } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import { variants, type BadgeVariants } from './variants';

	import Count from '../count';

	interface Props {
		label?: string;
		count?: number | undefined;
		variant?: BadgeVariants['variant'];
		icon?: ComponentType<Icon> | null | undefined;
		children?: import('svelte').Snippet;
	}

	const {
		label = 'Badge',
		count = undefined,
		variant = 'default',
		icon = null,
		children,
	}: Props = $props();
</script>

<div class={variants({ variant })}>
	{#if icon}
		{@const SvelteComponent = icon}
		<SvelteComponent class="h-3 w-3" />
	{/if}
	{#if children}{@render children()}{:else}{label}{/if}
	{#if count !== undefined}
		<Count {count} {variant} />
	{/if}
</div>
