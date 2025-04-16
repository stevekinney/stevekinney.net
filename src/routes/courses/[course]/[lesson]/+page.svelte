<script lang="ts">
  import Date from '$lib/components/date.svelte';
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
        <a href="/courses" class=" block text-primary-600 dark:text-primary-200">Courses</a>
      </li>
      <span>&rarr;</span>
      <li>
        <a href="/courses/{data.course.slug}" class=" block text-primary-600 dark:text-primary-200">
          {data.course.title}
        </a>
      </li>
    </ul>
    <h1 class="text-4xl font-bold">{data.title}</h1>
  </hgroup>

  <data.content class="prose dark:prose-invert" as="article" />

  {#if data.modified}
    <p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
      Last modified on <Date date={data.modified} />.
    </p>
  {/if}
</div>
