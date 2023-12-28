<script>
	import { default as DateTime } from '$lib/components/date.svelte';
	import metadata from '$lib/metadata';

	export let title = '';

	/** @type {Date | string | undefined } */
	export let date = undefined;

	/** @type {Date | string | undefined } */
	export let modified = undefined;

	/** @type {string | undefined } */
	export let description = undefined;

	/** @type { boolean } */
	export let published = false;
</script>

<svelte:head>
	{#if title}<title>{title} — {metadata.title}</title>{/if}
	{#if description}<meta name="description" content={description} />{/if}
	{#if published && date}<meta name="date" content={String(date)} />{/if}
	{#if published && modified}<meta name="last-modified" content={String(modified)} />{/if}
</svelte:head>

<article class="prose dark:prose-invert">
	<slot />
</article>

{#if published && modified}
	<p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
		Last modified on <DateTime date={modified} />.
	</p>
{/if}
