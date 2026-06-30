<script lang="ts">
  import DateTime from '$lib/components/date.svelte';
  import { NotebookPen } from '@lucide/svelte';
  import type { PostWithSlug } from '$lib/post-types';

  type Props = {
    posts: PostWithSlug[];
  };

  const { posts }: Props = $props();
</script>

<ul class="not-prose space-y-8">
  {#each posts as post (post.slug)}
    <li class="block">
      <a
        href="/writing/{post.slug}"
        class="group grid grid-cols-[50px_1fr] gap-4 rounded-md bg-slate-100 p-6 shadow-md hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <NotebookPen size={28} class="m-2" />
        <div>
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              class="decoration-primary-200 group-hover:decoration-primary-400 font-semibold decoration-4 group-hover:underline sm:text-xl"
            >
              {post.title}
            </span>
            <DateTime date={post.date} class="text-sm text-slate-500 dark:text-slate-400" />
          </div>
          <p>{post.description}</p>
        </div>
      </a>
    </li>
  {/each}
</ul>
