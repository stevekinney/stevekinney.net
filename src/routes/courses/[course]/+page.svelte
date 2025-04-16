<script lang="ts">
  import { page } from '$app/state';
  import PullRequest from '$lib/components/pull-request.svelte';
  import SEO from '$lib/components/seo.svelte';

  const { data } = $props();
</script>

<SEO title={data.title} description={data.description} published={data.published} />

<data.content />

<PullRequest filename="courses/{page.params.course}/README" />
