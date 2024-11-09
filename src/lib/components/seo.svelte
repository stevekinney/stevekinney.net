<script lang="ts">
	import { run } from 'svelte/legacy';

	import { page } from '$app/stores';
	import { formatPageTitle } from '$lib/format-page-title';


	interface Props {
		title?: string | undefined;
		description?: string;
		published?: boolean;
		date?: Date | string | undefined;
		modified?: Date | string | undefined;
		url?: any;
	}

	let {
		title = 'Steve Kinney',
		description = 'Steve Kinney is a teacher, artist, and software engineer out of Denver, Colorado, USA.',
		published = true,
		date = undefined,
		modified = undefined,
		url = new URL($page.url.pathname, 'https://stevekinney.net')
	}: Props = $props();

	let openGraph = $derived(new URL('/open-graph.jpg', 'https://stevekinney.net'));
	run(() => {
		if (title) openGraph.searchParams.set('title', encodeURIComponent(title));
	});
	run(() => {
		if (description) openGraph.searchParams.set('description', encodeURIComponent(description));
	});
	let openGraphUrl = $derived(openGraph.href);
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
