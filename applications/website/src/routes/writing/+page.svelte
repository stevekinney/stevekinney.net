<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import WritingPostList from '$lib/components/writing-post-list.svelte';
  import Pagination from '$lib/components/pagination';
  import { buildWritingPageHref } from '$lib/pagination';

  const { data } = $props();
</script>

<SEO title={data.title} description={data.description} />

<WritingPostList posts={data.posts} />

<Pagination
  currentPage={data.currentPage}
  totalPages={data.totalPages}
  buildHref={buildWritingPageHref}
  class="mt-8"
/>
