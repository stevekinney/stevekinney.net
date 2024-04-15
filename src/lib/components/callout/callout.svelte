<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { capitalize } from '$lib/capitalize';
	import { getVariationColor, getIcon, type CalloutVariation } from './variations';

	export let variant: CalloutVariation = 'note';
	export let title: string = capitalize(variant);
	export let description: string = '';
	export let foldable: boolean = false;

	let open = !foldable;
</script>

<div class="space-y-2 rounded-md border p-4 shadow-sm {getVariationColor(variant)}">
	<svelte:element
		this={foldable ? 'label' : 'div'}
		class="flex items-center gap-1 leading-tight text-current"
	>
		<svelte:component this={getIcon(variant)} class="w-4" />
		<span class="font-bold">{title}</span>
		{#if foldable}
			<input type="checkbox" bind:checked={open} class="peer hidden" />
			<ChevronDown class="ml-auto w-4 -rotate-90 transition-transform peer-checked:rotate-0" />
		{/if}
	</svelte:element>
	{#if $$slots.default || description}
		<div class="prose dark:prose-invert" class:hidden={foldable && !open}>
			<slot><p>{description}</p></slot>
		</div>
	{/if}
</div>
