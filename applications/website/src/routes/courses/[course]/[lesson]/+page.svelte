<script lang="ts">
  import { page } from '$app/state';
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import Date from '$lib/components/date.svelte';
  import OpenInObsidian from '$lib/components/open-in-obsidian.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema, buildCourseSchema } from '$lib/structured-data';

  const { data } = $props();

  const jsonLd = $derived([
    buildCourseSchema({
      name: data.course.title,
      description: data.course.description,
      courseUrl: `${url}/courses/${data.course.slug}`,
    }),
    buildBreadcrumbSchema([
      { name: 'Courses', url: `${url}/courses` },
      { name: data.course.title, url: `${url}/courses/${data.course.slug}` },
      { name: data.title, url: `${url}/courses/${data.course.slug}/${page.params.lesson}` },
    ]),
  ]);
</script>

<SEO title={`${data.title} | ${data.course.title}`} description={data.description} {jsonLd} />

<ContentEnhancements />

<OpenInObsidian repoPath={data.sourcePath} />

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

  <div data-content-document>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.contentHtml}
  </div>

  {#if data.modified}
    <p class="my-6 text-right text-sm text-slate-500 dark:text-gray-400">
      Last modified on <Date date={data.modified} />.
    </p>
  {/if}
</div>

<PullRequest repoPath={data.sourcePath} />
