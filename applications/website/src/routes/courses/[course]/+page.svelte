<script lang="ts">
  import { page } from '$app/state';
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

<OpenInObsidian repoPath="courses/{page.params.course}/README.md" />

<data.content />

<PullRequest repoPath="courses/{page.params.course}/README.md" />
