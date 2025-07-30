<script lang="ts">
  import Link from '$lib/components/link.svelte';
  import SEO from '$lib/components/seo.svelte';
  import formatDate from '$lib/format-date';
  import { description, title } from '$lib/metadata';
  import Biography from './biography.md';

  const { data } = $props();
</script>

<SEO {title} {description} />

<!-- Skip link for keyboard users -->
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:outline-none focus:ring-2 focus:ring-primary-600">
  Skip to main content
</a>

<main id="main-content" class="grid grid-cols-1 gap-8 md:grid-cols-[1fr_fit]">
  <section class="space-y-4">
    <h1 class="text-xl font-bold">Recent Posts</h1>
    <ul class="space-y-2">
      {#each data.posts as post}
        <li class="space-x-2">
          <Link href="/writing/{post.slug}">{post.title}</Link>
          <time class="text-primary-800 dark:text-primary-200 text-sm" datetime={post.date}>
            {formatDate(post.date)}
          </time>
        </li>
      {/each}
    </ul>
  </section>

  <enhanced:img
    src="$assets/self-portrait.jpg?w=736;768"
    sizes="(min-width: 640px) 768px, 736px"
    class="block aspect-[3/4] max-w-full rounded-md shadow-lg sm:w-72 md:w-96"
    alt="Steve Kinney"
  />

  <Biography class="prose dark:prose-invert order-first max-w-none md:order-last md:col-span-2" />
</main>
