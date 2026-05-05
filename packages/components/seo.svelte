<script lang="ts">
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { encodeParameters } from '$lib/encode-parameters';
  import { formatPageTitle } from '$lib/format-page-title';
  import { createLlmsAlternatePath } from '$lib/llms-path';
  import { author, title as siteTitle, url as siteUrl } from '$lib/metadata';
  import { buildOpenGraphHash } from '$lib/og/hash';
  import { normalizeOpenGraphPath } from '$lib/og/paths';
  import type { Snippet } from 'svelte';

  // Use PUBLIC_SITE_URL if set, otherwise keep social image URLs on the canonical site.
  const baseUrl = env.PUBLIC_SITE_URL || siteUrl;

  type SEOProps = {
    title: string;
    description: string;
    date?: Date | string;
    modified?: Date | string;
    children?: Snippet;
    imageParams?: Record<string, string>;
    type?: 'website' | 'article';
    twitterCard?: 'summary' | 'summary_large_image';
    twitterCreator?: string;
    accentColor?: string;
    secondaryAccentColor?: string;
    textColor?: string;
    backgroundColor?: string;
    hideFooter?: boolean;
    jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  };
  type ImageConfig = Pick<
    SEOProps,
    | 'title'
    | 'description'
    | 'accentColor'
    | 'secondaryAccentColor'
    | 'textColor'
    | 'backgroundColor'
    | 'hideFooter'
    | 'imageParams'
  >;

  const {
    title,
    description,
    date,
    modified,
    children,
    imageParams,
    type = 'website',
    twitterCard = 'summary_large_image',
    twitterCreator = '@stevekinney',
    accentColor,
    secondaryAccentColor,
    textColor,
    backgroundColor,
    hideFooter,
    jsonLd,
  }: SEOProps = $props();

  const jsonLdScript = $derived.by(() => {
    if (!jsonLd) return '';
    const data = Array.isArray(jsonLd)
      ? { '@context': 'https://schema.org', '@graph': jsonLd }
      : jsonLd;
    return '<script type="application/ld+json">' + JSON.stringify(data) + '</' + 'script>';
  });

  const formattedTitle = $derived(formatPageTitle(title));
  const currentUrl = $derived(page.url.href);

  const createPerRouteImage = (pathname: string, version: string): string => {
    const path = pathname === '/' ? '/open-graph.jpg' : `${pathname}/open-graph.jpg`;
    return `${baseUrl}${path}?v=${version}`;
  };

  // Create image URL with all provided parameters.
  const createImageUrl = ({
    title,
    description,
    accentColor,
    secondaryAccentColor,
    textColor,
    backgroundColor,
    hideFooter,
    imageParams,
  }: ImageConfig): string => {
    const params = {
      title,
      description,
      ...(accentColor ? { accentColor } : {}),
      ...(secondaryAccentColor ? { secondaryAccentColor } : {}),
      ...(textColor ? { textColor } : {}),
      ...(backgroundColor ? { backgroundColor } : {}),
      ...(hideFooter !== undefined ? { hideFooter: String(hideFooter) } : {}),
      ...(imageParams ?? {}),
    };
    const query = encodeParameters(params);
    return `${baseUrl}/open-graph?${query}`;
  };

  const usesCustomImage = $derived(
    Boolean(
      imageParams ||
      accentColor ||
      secondaryAccentColor ||
      textColor ||
      backgroundColor ||
      hideFooter !== undefined,
    ),
  );

  const perRouteHash = $derived(
    buildOpenGraphHash({
      title,
      description,
      accentColor,
      secondaryAccentColor,
      textColor,
      backgroundColor,
      hideFooter,
    }),
  );

  const normalizedPath = $derived(normalizeOpenGraphPath(page.url.pathname));

  const perRouteImage = $derived(createPerRouteImage(normalizedPath, perRouteHash));

  const queryImage = $derived(
    createImageUrl({
      title,
      description,
      accentColor,
      secondaryAccentColor,
      textColor,
      backgroundColor,
      hideFooter,
      imageParams,
    }),
  );

  const image = $derived(usesCustomImage ? queryImage : perRouteImage);

  const dateIso = $derived(date ? new Date(date).toISOString() : undefined);
  const modifiedIso = $derived(modified ? new Date(modified).toISOString() : undefined);
  const llmsAlternatePath = $derived(createLlmsAlternatePath(page.url.pathname));
</script>

<svelte:head>
  <title>{formattedTitle}</title>
  <link rel="canonical" href={currentUrl} />
  <link
    rel="alternate"
    type="application/atom+xml"
    title="Steve Kinney's Writing"
    href="/writing/rss"
  />
  {#if llmsAlternatePath}
    <link rel="alternate" type="text/plain" title="LLM-readable content" href={llmsAlternatePath} />
  {/if}

  <meta name="robots" content="index, follow" />
  <meta name="description" content={description} />
  <meta name="author" content={author} />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={currentUrl} />
  <meta property="og:title" content={formattedTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:site_name" content={siteTitle} />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content={image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={formattedTitle} />

  <!-- Twitter -->
  <meta name="twitter:card" content={twitterCard} />
  <meta name="twitter:url" content={currentUrl} />
  <meta name="twitter:title" content={formattedTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:creator" content={twitterCreator} />
  <meta name="twitter:image" content={image} />
  <meta name="twitter:image:alt" content={formattedTitle} />

  <!-- Publication dates for SEO and social sharing -->
  {#if dateIso}
    <meta name="date" content={dateIso} />
    <meta property="article:published_time" content={dateIso} />
  {/if}

  {#if modifiedIso}
    <meta name="last-modified" content={modifiedIso} />
    <meta property="article:modified_time" content={modifiedIso} />
  {/if}

  <!-- Structured Data -->
  {#if jsonLdScript}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html jsonLdScript}
  {/if}

  <!-- Additional tags from parent component -->
  {#if children}
    {@render children()}
  {/if}
</svelte:head>
