<script lang="ts">
	import { page } from '$app/stores';
	import { formatPageTitle } from '$lib/format-page-title';

	export let title: string | undefined = 'Steve Kinney';
	export let description =
		'Steve Kinney is a teacher, artist, and software engineer out of Denver, Colorado, USA.';

	export let published = true;
	export let date: Date | string | undefined = undefined;
	export let modified: Date | string | undefined = undefined;
	export let url = $page.url;

	$: openGraph = new URL('/open-graph.jpg', url.href);
	$: if (title) openGraph.searchParams.set('title', encodeURIComponent(title));
	$: if (description) openGraph.searchParams.set('description', encodeURIComponent(description));
	$: openGraphUrl = openGraph.href;
</script>

<svelte:head>
	<title>{formatPageTitle(title)}</title>
	<link rel="image_src" href={openGraphUrl} />
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={formatPageTitle(title)} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url.href} />
	<meta property="og:image" content={openGraphUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={formatPageTitle(title)} />
	<meta name="twitter:creator" content="@stevekinney" />
	<meta property="twitter:description" content={description} />
	<meta property="twitter:image" content={openGraphUrl} />
	{#if published && date}
		<meta name="date" content={String(date)} />
		<meta name="article:published_time" content={String(date)} />
	{/if}
	{#if published && modified}
		<meta name="last-modified" content={String(modified)} />
		<meta name="article:modified_time" content={String(modified)} />
	{/if}
</svelte:head>
