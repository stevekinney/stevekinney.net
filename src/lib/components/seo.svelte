<script lang="ts">
  import { page } from '$app/state';
  import { formatPageTitle } from '$lib/format-page-title';

  interface SEOProps {
    title: string;
    description: string;
    published?: boolean;
    date?: Date | string;
    modified?: Date | string;
    children?: import('svelte').Snippet;
  }

  const {
    title,
    description,
    published = true,
    date = undefined,
    modified = undefined,
    children,
  }: SEOProps = $props();

  const parameters = new URLSearchParams(page.url.search);
  const image = $derived(new URL('/og', page.url.origin).href + `?${parameters.toString()}`);
</script>

<svelte:head>
  <title>{formatPageTitle(title)}</title>
  <link rel="canonical" href={page.url.href} />

  <meta name="description" content={description} />

  <meta property="og:type" content="website" />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:title" content={formatPageTitle(title)} />
  <meta property="og:description" content={description} />

  <meta property="og:site_name" content="Steve Kinney" />
  <meta property="og:locale" content="en_US" />

  <meta property="og:image" content={image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={page.url.href} />
  <meta name="twitter:title" content={formatPageTitle(title)} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:creator" content="@stevekinney" />
  <meta name="twitter:image" content={image} />

  {#if published && date}
    <meta name="date" content={new Date(date).toISOString()} />
    <meta property="article:published_time" content={new Date(date).toISOString()} />
  {/if}

  {#if published && modified}
    <meta name="last-modified" content={new Date(modified).toISOString()} />
    <meta property="article:modified_time" content={new Date(modified).toISOString()} />
  {/if}

  {#if children}
    {@render children()}
  {/if}
</svelte:head>
