<script lang="ts">
	import type { Icon } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import { variants, type BadgeVariants } from './variants';

	import Count from '../count';

	export let label: string = 'Badge';
	export let count: number | undefined = undefined;
	export let variant: BadgeVariants['variant'] = 'default';
	export let icon: ComponentType<Icon> | null | undefined = null;
</script>

<div class={variants({ variant })}>
	{#if icon}
		<svelte:component this={icon} class="h-3 w-3" />
	{/if}
	<slot>{label}</slot>
	{#if count !== undefined}
		<Count {count} {variant} />
	{/if}
</div>
