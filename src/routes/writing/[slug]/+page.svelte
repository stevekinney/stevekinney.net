<script lang="ts">
	import metadata from '$lib/metadata';

	import Date from '$lib/components/date.svelte';

	export let data;
</script>

<svelte:head>
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.meta.title} />
	<meta property="og:description" content={data.meta.description} />
	<meta property="article:published_time" content={data.meta.date} />
	<meta property="article:modified_time" content={data.meta.modified} />
	<meta property="article:author" content="Steve Kinney" />
</svelte:head>

<div>
	<hgroup class="mb-10 space-y-2">
		<Date date={data.meta.date} />
		<h1 class="text-2xl font-bold">{data.meta.title}</h1>
	</hgroup>

	<svelte:component this={data.content} />
</div>

<footer
	class="my-10 rounded-md border-2 border-purple-200 bg-purple-100 px-8 py-4 dark:border-purple-900 dark:bg-purple-800"
>
	<p>
		See something that looks a little off? Feel free to <a
			href="https://github.com/stevekinney/stevekinney.net/blob/main/src/posts/{data.slug}.md"
			class="font-semibold underline decoration-purple-500 decoration-2 underline-offset-4"
			>open a pull request here</a
		>.
	</p>
</footer>
