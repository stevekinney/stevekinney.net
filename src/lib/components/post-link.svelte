<script lang="ts">
  import type { PostWithSlug } from '$lib/posts';
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

<svelte:element
  this={as}
  class={merge('group flex flex-wrap items-center gap-1', className)}
  data-post-link
  {...rest}
>
  <Date date={post.date} />
  <Link
    {href}
    class="decoration-primary-400 bg-transparent decoration-2 underline-offset-4"
    data-post-link-title
  >
    {post.title}
  </Link>
</svelte:element>
