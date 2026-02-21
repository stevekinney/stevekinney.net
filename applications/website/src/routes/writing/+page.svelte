<script lang="ts">
  import DateTime from '$lib/components/date.svelte';
  import SEO from '$lib/components/seo.svelte';
  import { NotebookPen } from 'lucide-svelte';

  export let data;
</script>

<SEO title={data.title} description={data.description} />

<ul class="not-prose space-y-8">
  {#each data.posts as post (post.slug)}
    <li class="block">
      <a
        href="/writing/{post.slug}"
        class="group grid grid-cols-[50px_1fr] gap-4 rounded bg-slate-50 p-4 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900"
      >
        <NotebookPen size={28} class="m-2" />
        <div>
          <h3
            class="decoration-primary-200 group-hover:decoration-primary-400 font-semibold decoration-4 group-hover:underline sm:text-xl"
          >
            {post.title}
          </h3>
          <DateTime date={post.date} />
          <p>{post.description}</p>
          <div></div>
        </div></a
      >
    </li>
  {/each}
</ul>
