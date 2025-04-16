<script lang="ts">
  import SEO from '$lib/components/seo.svelte';

  const { data } = $props();
</script>

<SEO title={data.title} description={data.description} published={data.published} />

<data.content />
