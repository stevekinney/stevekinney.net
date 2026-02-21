<script lang="ts">
  import Date from '$lib/components/date.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';

  const { data } = $props();
</script>

<SEO
  title={data.meta.title}
  description={data.meta.description}
  published={data.meta.published}
  date={data.meta.date}
  modified={data.meta.modified}
/>

<div class="space-y-10">
  <hgroup class="space-y-2">
    <Date date={data.meta.date} />
    <h1 class="text-2xl font-bold">{data.meta.title}</h1>
  </hgroup>

  <p class="font-serif text-2xl">
    {data.meta.description}
  </p>

  <data.content class="prose dark:prose-invert max-w-none" as="article" />

  {#if data.meta.published && data.meta.modified}
    <p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
      Last modified on <Date date={data.meta.modified} />.
    </p>
  {/if}
</div>

<PullRequest repoPath="content/writing/{data.slug}.md" />
