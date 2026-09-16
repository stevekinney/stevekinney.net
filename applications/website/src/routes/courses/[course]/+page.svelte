<script lang="ts">
  import { page } from '$app/state';
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import OpenInObsidian from '$lib/components/open-in-obsidian.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema, buildCourseSchema } from '$lib/structured-data';

  const { data } = $props();

  const courseJsonLd = $derived([
    buildCourseSchema({
      name: data.title,
      description: data.description,
      courseUrl: `${url}/courses/${page.params.course}`,
      datePublished: data.date,
      dateModified: data.modified,
    }),
    buildBreadcrumbSchema([
      { name: 'Courses', url: `${url}/courses` },
      { name: data.title, url: `${url}/courses/${page.params.course}` },
    ]),
  ]);
</script>

<SEO
  title={data.title}
  description={data.description}
  date={data.date}
  modified={data.modified}
  jsonLd={courseJsonLd}
/>

<ContentEnhancements />

<OpenInObsidian repositoryPath={data.sourcePath} />

<div data-content-document>
  <h1 class="mb-6 text-4xl font-bold">{data.title}</h1>
  <div class="prose dark:prose-invert max-w-none">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.contentHtml}
  </div>
</div>

<PullRequest repositoryPath={data.sourcePath} />
