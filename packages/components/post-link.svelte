<script lang="ts">
  import type { PostWithSlug } from '$lib/post-types';
  import { merge } from '$merge';
  import type { SvelteHTMLElements } from 'svelte/elements';
  import Date from './date.svelte';
  import Link from './link.svelte';

  type Props = {
    post: PostWithSlug;
    href: string;
    as?: keyof SvelteHTMLElements;
    class?: string;
    [key: string]: unknown;
  };

  const { post, href, as = 'div', class: className = '', ...rest }: Props = $props();
</script>

<svelte:element this={as} class={merge('group block', className)} data-post-link {...rest}>
  <Link
    {href}
    class="decoration-primary-400 -mx-1 bg-transparent box-decoration-clone px-1 py-0.5 font-semibold decoration-2 underline-offset-4"
    data-post-link-title
  >
    {post.title}
  </Link>
  <Date
    date={post.date}
    class="ml-2 inline text-sm whitespace-nowrap text-slate-500 dark:text-slate-400"
  />
</svelte:element>
