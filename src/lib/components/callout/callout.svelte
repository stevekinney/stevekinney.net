<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { capitalize } from '$lib/capitalize';
	import { getVariationColor, getIcon, type CalloutVariation } from './variations';

	interface Props {
		variant?: CalloutVariation;
		title?: string;
		description?: string;
		foldable?: boolean;
		children?: import('svelte').Snippet;
	}

	const {
		variant = 'note',
		title = capitalize(variant),
		description = '',
		foldable = false,
		children,
	}: Props = $props();

	let open = $state(!foldable);

	const SvelteComponent = $derived(getIcon(variant));
</script>

<div class="space-y-2 rounded-md border p-4 shadow-sm {getVariationColor(variant)}">
	<svelte:element
		this={foldable ? 'label' : 'div'}
		class="flex items-center gap-2 leading-tight text-current"
	>
		<SvelteComponent class="w-4" />
		<span class="font-bold">{title}</span>
		{#if foldable}
			<input type="checkbox" bind:checked={open} class="peer hidden" />
			<ChevronDown class="ml-auto w-4 -rotate-90 transition-transform peer-checked:rotate-0" />
		{/if}
	</svelte:element>
	{#if children || description}
		<div class="prose dark:prose-invert" class:hidden={foldable && !open}>
			{#if children}{@render children()}{:else}<p>{description}</p>{/if}
		</div>
	{/if}
</div>
