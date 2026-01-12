<script lang="ts">
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import { encodeParameters } from '$lib/encode-parameters';
  import { formatPageTitle } from '$lib/format-page-title';
  import { author, title as siteTitle } from '$lib/metadata';
  import type { Snippet } from 'svelte';

  // Use PUBLIC_SITE_URL if set, otherwise fall back to page origin
  // (works correctly in both SSR and prerendering via kit.prerender.origin)
  const baseUrl = env.PUBLIC_SITE_URL || page.url.origin;

  type SEOProps = {
    title: string;
    description: string;
    published?: boolean;
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
    published = true,
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
  }: SEOProps = $props();

  const formattedTitle = $derived(formatPageTitle(title));
  const currentUrl = $derived(page.url.href);

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

  const image = $derived(
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

  const dateIso = $derived(date ? new Date(date).toISOString() : undefined);
  const modifiedIso = $derived(modified ? new Date(modified).toISOString() : undefined);
</script>

<svelte:head>
  <title>{formattedTitle}</title>
  <link rel="canonical" href={currentUrl} />

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

  <!-- Twitter -->
  <meta name="twitter:card" content={twitterCard} />
  <meta name="twitter:url" content={currentUrl} />
  <meta name="twitter:title" content={formattedTitle} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:creator" content={twitterCreator} />
  <meta name="twitter:image" content={image} />

  <!-- Publication dates for SEO and social sharing -->
  {#if published && dateIso}
    <meta name="date" content={dateIso} />
    <meta property="article:published_time" content={dateIso} />
  {/if}

  {#if published && modifiedIso}
    <meta name="last-modified" content={modifiedIso} />
    <meta property="article:modified_time" content={modifiedIso} />
  {/if}

  <!-- Additional tags from parent component -->
  {#if children}
    {@render children()}
  {/if}
</svelte:head>
