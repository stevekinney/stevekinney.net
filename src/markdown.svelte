<script>
	import { default as DateTime } from '$lib/components/date.svelte';

	/** @type {Date | string | undefined } */
	export let title = '';

	/** @type {Date | string | undefined } */
	export let description = '';

	/** @type {Date | string | undefined } */
	export let date = undefined;

	/** @type {Date | string | undefined } */
	export let modified = undefined;

	/** @type { boolean } */
	export let published = false;

	export const metadata = {
		title,
		description,
		date,
		modified,
		published,
	};
</script>

<article class="prose dark:prose-invert">
	<slot />
</article>

{#if published && modified}
	<p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
		Last modified on <DateTime date={modified} />.
	</p>
{/if}
