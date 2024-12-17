<script lang="ts">
	import type { BaseAttributes, ExtendElement } from '../component.types';
	import { ChevronDown } from 'lucide-svelte';
	import { capitalize } from '$lib/capitalize';
	import { getVariationColor, getIcon, type CalloutVariation } from './variations';

	type Props = ExtendElement<
		BaseAttributes,
		{
			variant?: CalloutVariation;
			title?: string;
			description?: string;
			foldable?: boolean;
		}
	>;

	const {
		variant = 'note',
		description = '',
		title = capitalize(variant),
		foldable = false,
		children,
	}: Props = $props();

	const Icon = $derived(getIcon(variant));
	let open = $state(!foldable);
</script>

<div class="space-y-2 rounded-md border p-4 shadow-sm {getVariationColor(variant)}">
	<svelte:element
		this={foldable ? 'label' : 'div'}
		class="flex items-center gap-2 leading-tight text-current"
	>
		<Icon class="w-4" />
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
