<script lang="ts">
	import { page } from '$app/stores';
	import { formatPageTitle } from '$lib/format-page-title';
	import { encodeParameters } from '$lib/encode-parameters';

	interface SEOProps {
		title?: string;
		description?: string;
		published?: boolean;
		date?: Date | string;
		modified?: Date | string;
		url?: any;
		children?: import('svelte').Snippet;
	}

	const {
		title = 'Steve Kinney',
		description = 'Steve Kinney is a teacher, artist, and software engineer out of Denver, Colorado, USA.',
		published = true,
		date = undefined,
		modified = undefined,
		url = new URL($page.url.pathname, $page.url.origin),
		children,
	}: SEOProps = $props();

	const openGraph = $derived(
		new URL(`/open-graph.jpg?${encodeParameters({ title, description })}`, $page.url.origin),
	);
</script>

<svelte:head>
	<title>{formatPageTitle(title)}</title>
	<link rel="image_src" href={openGraph.href} />
	<meta name="description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={formatPageTitle(title)} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={url.href} />
	<meta property="og:image" content={openGraph.href} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={formatPageTitle(title)} />
	<meta name="twitter:creator" content="@stevekinney" />
	<meta property="twitter:description" content={description} />
	<meta property="twitter:image" content={openGraph.href} />
	{#if published && date}
		<meta name="date" content={String(date)} />
		<meta name="article:published_time" content={String(date)} />
	{/if}
	{#if published && modified}
		<meta name="last-modified" content={String(modified)} />
		<meta name="article:modified_time" content={String(modified)} />
	{/if}

	{#if children}
		{@render children()}
	{/if}
</svelte:head>
