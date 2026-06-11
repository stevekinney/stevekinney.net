<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import WritingPostList from '$lib/components/writing-post-list.svelte';
  import Pagination from '$lib/components/pagination';
  import { buildWritingPageHref } from '$lib/pagination';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([{ name: 'Writing', url: `${url}/writing` }]);
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<h2 class="sr-only">Writing</h2>

<WritingPostList posts={data.posts} />

<Pagination
  currentPage={data.currentPage}
  totalPages={data.totalPages}
  buildHref={buildWritingPageHref}
  class="mt-8"
/>
