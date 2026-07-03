<script lang="ts">
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import OpenInObsidian from '$lib/components/open-in-obsidian.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  const { data } = $props();

  const jsonLd = $derived(
    buildBreadcrumbSchema([
      { name: 'Projects', url: `${url}/projects` },
      { name: data.project.name, url: `${url}/projects/${data.project.slug}` },
    ]),
  );
</script>

<SEO title={data.project.name} description={data.project.description} {jsonLd} />

<ContentEnhancements />

<OpenInObsidian repositoryPath={data.sourcePath} />

<article class="space-y-10">
  <hgroup class="space-y-3">
    <p class="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
      Project
    </p>
    <h1 class="text-3xl font-bold">{data.project.name}</h1>
    <p class="max-w-3xl font-serif text-2xl text-slate-700 dark:text-slate-300">
      {data.project.description}
    </p>
  </hgroup>

  <div class="flex flex-wrap gap-x-4 gap-y-2">
    <a
      class="font-semibold underline decoration-4 underline-offset-8"
      href={data.project.githubUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      GitHub
    </a>
    {#if data.project.productionUrl}
      <a
        class="font-semibold underline decoration-4 underline-offset-8"
        href={data.project.productionUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Production
      </a>
    {/if}
    {#if data.project.writingPath}
      <a
        class="font-semibold underline decoration-4 underline-offset-8"
        href={data.project.writingPath}
      >
        Related Writing
      </a>
    {/if}
    {#if data.project.youtubeUrl}
      <a
        class="font-semibold underline decoration-4 underline-offset-8"
        href={data.project.youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        YouTube
      </a>
    {/if}
  </div>

  {#if data.project.youtubeEmbedUrl}
    <div class="aspect-video overflow-hidden rounded border border-slate-200 dark:border-slate-800">
      <iframe
        class="size-full"
        src={data.project.youtubeEmbedUrl}
        title={`${data.project.name} on YouTube`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
      ></iframe>
    </div>
  {/if}

  <div data-content-document>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.contentHtml}
  </div>
</article>

<PullRequest repositoryPath={data.sourcePath} />
