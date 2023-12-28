<script lang="ts">
	import { default as DateTime } from '$lib/components/date.svelte';
	import metadata from '$lib/metadata';

	export let title = '';
	export let date: Date | string | undefined = undefined;
	export let modified: Date | string | undefined = undefined;
	export let description: string | undefined = undefined;
	export let published: boolean = false;
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
