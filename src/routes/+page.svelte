<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import { description, title } from '$lib/metadata';
  import Biography from './biography.md';

  const { data } = $props();
</script>

<SEO {title} {description} />

<div class="space-y-8">
  <enhanced:img
    src="$assets/self-portrait.jpg?w=736;768"
    sizes="(min-width: 640px) 768px, 736px"
    class="aspect-[3/4] max-w-full rounded-md shadow-lg sm:float-right sm:ml-8 sm:w-72 md:w-96"
    alt="Steve Kinney"
  />
  <Biography class="prose dark:prose-invert" />
</div>
