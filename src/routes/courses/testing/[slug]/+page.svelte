<script lang="ts">
	import SEO from '$lib/components/seo.svelte';
	import Date from '$lib/components/date.svelte';
	import Resources from './resources.svelte';
	import Edit from './edit.svelte';

	export let data;
</script>

<SEO
	title="{data.meta.title} — Introduction to Testing JavaScript with Vitest"
	description={data.meta.description}
	published={data.meta.published}
/>

<div class="space-y-10">
	<hgroup class="space-y-2">
		<h1 class="text-4xl font-bold">{data.meta.title}</h1>
		<Resources />
		<Edit />
	</hgroup>

	<svelte:component this={data.content} class="prose dark:prose-invert" as="article" />

	{#if data.meta.modified}
		<p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
			Last modified on <Date date={data.meta.modified} />.
		</p>
	{/if}
</div>

<footer
	class="my-10 rounded-md border-2 border-primary-200 bg-primary-100 px-8 py-4 dark:border-primary-900 dark:bg-primary-800"
>
	<p>
		See something that looks a little off? Feel free to <a
			href="https://github.com/stevekinney/stevekinney.net/tree/main/content{data.pathname}.md"
			class="font-semibold underline decoration-primary-500 decoration-2 underline-offset-4"
		>
			open a pull request here
		</a>.
	</p>
</footer>
