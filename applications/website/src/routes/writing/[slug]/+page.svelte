<script lang="ts">
  import { page } from '$app/state';
  import { env } from '$env/dynamic/public';
  import Date from '$lib/components/date.svelte';
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import OpenInObsidian from '$lib/components/open-in-obsidian.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildArticleSchema } from '$lib/structured-data';

  const { data } = $props();

  const baseUrl = env.PUBLIC_SITE_URL || page.url.origin;

  const articleJsonLd = $derived(
    buildArticleSchema({
      title: data.meta.title,
      description: data.meta.description,
      datePublished: data.meta.date,
      dateModified: data.meta.modified,
      articleUrl: `${url}/writing/${data.slug}`,
      imageUrl: `${baseUrl}/writing/${data.slug}/open-graph.jpg`,
    }),
  );
</script>

<SEO
  title={data.meta.title}
  description={data.meta.description}
  date={data.meta.date}
  modified={data.meta.modified}
  type="article"
  jsonLd={articleJsonLd}
/>

<ContentEnhancements />

<OpenInObsidian repositoryPath={data.sourcePath} />

<article class="space-y-10">
  <hgroup class="space-y-2">
    <Date date={data.meta.date} />
    <h1 class="text-2xl font-bold">{data.meta.title}</h1>
  </hgroup>

  <p class="font-serif text-2xl">
    {data.meta.description}
  </p>

  <div data-content-document>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.contentHtml}
  </div>

  {#if data.meta.modified}
    <p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
      Last modified on <Date date={data.meta.modified} />.
    </p>
  {/if}
</article>

<PullRequest repositoryPath={data.sourcePath} />
