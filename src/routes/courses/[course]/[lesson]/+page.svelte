<script lang="ts">
  import { page } from '$app/state';
  import Date from '$lib/components/date.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';

  const { data } = $props();
</script>

<SEO
  title="{data.title} | {data.course.title}"
  description={data.description}
  published={data.published}
/>

<div class="space-y-10">
  <hgroup class="space-y-2">
    <ul class="flex gap-2">
      <li>
        <a href="/courses" class=" text-primary-600 dark:text-primary-200 block">Courses</a>
      </li>
      <span>&rarr;</span>
      <li>
        <a href="/courses/{data.course.slug}" class=" text-primary-600 dark:text-primary-200 block">
          {data.course.title}
        </a>
      </li>
    </ul>
    <h1 class="text-4xl font-bold">{data.title}</h1>
  </hgroup>

  <data.content class="prose dark:prose-invert max-w-none" as="article" />

  {#if data.modified}
    <p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
      Last modified on <Date date={data.modified} />.
    </p>
  {/if}
</div>

<PullRequest filename="courses/{page.params.course}/{page.params.lesson}" />
