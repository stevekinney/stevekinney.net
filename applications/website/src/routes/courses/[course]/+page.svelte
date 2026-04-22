<script lang="ts">
  import { page } from '$app/state';
  import ContentEnhancements from '$lib/components/content-enhancements.svelte';
  import OpenInObsidian from '$lib/components/open-in-obsidian.svelte';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildCourseSchema } from '$lib/structured-data';

  const { data } = $props();

  const courseJsonLd = $derived(
    buildCourseSchema({
      name: data.title,
      description: data.description,
      courseUrl: `${url}/courses/${page.params.course}`,
    }),
  );
</script>

<SEO title={data.title} description={data.description} jsonLd={courseJsonLd} />

<ContentEnhancements />

<OpenInObsidian repoPath={data.sourcePath} />

<div data-content-document>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.contentHtml}
</div>

<PullRequest repoPath={data.sourcePath} />
