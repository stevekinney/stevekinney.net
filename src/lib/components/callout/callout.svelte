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

<div class="space-y-2 rounded-md border border-current p-4 shadow-sm {getVariationColor(variant)}">
	<label class="flex items-center gap-1 leading-tight text-current">
		<input type="checkbox" bind:checked={open} class="peer hidden" />
		<svelte:component this={getIcon(variant)} class="w-4" />
		<span class="font-bold">{title}</span>
		{#if foldable}
			<ChevronDown class="ml-auto w-4 -rotate-90 transition-transform peer-checked:rotate-0" />
		{/if}
	</label>
	{#if $$slots.default || description}
		<div class="prose" class:hidden={!open}>
			<slot><p>{description}</p></slot>
		</div>
	{/if}
</div>
