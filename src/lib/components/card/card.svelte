<script lang="ts" module>
	import { merge } from '$merge';
	import formatDate from '$lib/format-date';
	import type { BaseAttributes } from '$lib/components/component.types';

	import { variants, type CardVariants } from './variants';

	type ValidElements = 'div' | 'section' | 'aside' | 'article' | 'li' | 'a';

	type CardProps = BaseAttributes &
		CardVariants & {
			title?: string;
			description?: string;
			date?: Date | string;
			url?: string;
			as?: ValidElements;
		};
</script>

<script lang="ts">
	let {
		title,
		description,
		date,
		url,
		variant = 'default',
		as = url ? 'a' : 'div',
		children,
	}: CardProps = $props();
</script>

<svelte:element this={as} class={variants({ variant })}>
	<svelte:element this={url ? 'a' : 'div'} href={url} class={merge(url && 'group')}>
		{#if title}
			<h3
				class="mb-4 font-semibold decoration-primary-500 decoration-2 underline-offset-4 group-hover:underline dark:text-primary-50"
			>
				{title}
			</h3>
		{/if}

		{#if date}
			<p class="mb-1 text-primary-600 dark:text-primary-400">{formatDate(date)}</p>
		{/if}

		{#if children}
			{@render children?.()}
		{:else}
			<p class="line-clamp-4">{description}</p>
		{/if}
	</svelte:element>
</svelte:element>
