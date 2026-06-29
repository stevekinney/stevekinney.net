<script lang="ts">
  import { Rss } from '@lucide/svelte';
  import Card from '$lib/components/card';
  import PostLink from '$lib/components/post-link.svelte';
  import SEO from '$lib/components/seo.svelte';
  import coursesData from '$lib/courses.toml';
  import type { Recording } from '$lib/recording-types';
  import { description, title } from '$lib/metadata';
  import { buildPersonSchema, buildWebSiteSchema } from '$lib/structured-data';
  import { POSTS_PER_PAGE } from '$lib/pagination';
  import Biography from './biography.md';

  const recordings = coursesData.recording as Recording[];

  const selfPortrait = {
    src: 'https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com/images/889e826f59de6854/original.jpg',
    avifSrcset:
      'https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com/images/889e826f59de6854/avif-384w.avif 384w, https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com/images/889e826f59de6854/avif-768w.avif 768w',
    width: 768,
    height: 1024,
    lqip: 'data:image/webp;base64,UklGRkwAAABXRUJQVlA4IEAAAACwAwCdASoYACAAPwl0sVA/rK8isBgMA/AhCWcAsswX5hRot+ZR4AD+3aY6a5cpdwaqhYvkAeTUd/4ZPf2L+WAA',
  };

  const { data } = $props();

  const recentPosts = $derived(data.posts.slice(0, POSTS_PER_PAGE));

  const jsonLd = [buildWebSiteSchema(), buildPersonSchema()];
</script>

<SEO {title} {description} {jsonLd} />

<div class="space-y-10">
  <div class="grid grid-cols-1 items-start gap-10 lg:grid-cols-4">
    <div class="lg:col-span-3">
      <section class="prose dark:prose-invert max-w-none">
        <picture
          class="not-prose float-left mr-4 mb-3 block w-32 sm:mr-6 sm:w-40 md:w-48 lg:w-56 xl:w-64"
        >
          <source
            type="image/avif"
            srcset={selfPortrait.avifSrcset}
            sizes="(min-width: 1280px) 256px, (min-width: 1024px) 224px, (min-width: 768px) 192px, (min-width: 640px) 160px, 128px"
          />
          <img
            src={selfPortrait.src}
            width={selfPortrait.width}
            height={selfPortrait.height}
            class="block aspect-[3/4] w-full rounded-md shadow-lg"
            alt="Steve Kinney"
            fetchpriority="high"
            loading="eager"
            decoding="auto"
            style="background-size:cover;background-image:url({selfPortrait.lqip})"
          />
        </picture>
        <Biography />
      </section>
    </div>

    <aside class="flex flex-col gap-2 lg:gap-8" aria-labelledby="recent-writing-heading">
      <h2 id="recent-writing-heading" class="text-lg font-bold">Recent Writing</h2>
      <ul class="space-y-4">
        {#each recentPosts as post (post.slug)}
          <PostLink {post} href="/writing/{post.slug}" as="li" />
        {/each}
      </ul>
      <p>
        <a
          href="/writing/rss"
          class="group flex items-center gap-2"
          data-sveltekit-preload-data="false"
          data-sveltekit-reload
        >
          <Rss size={16} />
          <span
            class="decoration-primary-700 decoration-2 underline-offset-2 group-hover:underline"
          >
            RSS Feed
          </span>
        </a>
      </p>
      <p>
        <a
          href="/writing"
          class="decoration-primary-700 decoration-2 underline-offset-2 hover:underline"
        >
          View all writing &rarr;
        </a>
      </p>
    </aside>
  </div>

  <section>
    <h2 class="prose dark:prose-invert mb-6 text-2xl font-bold">Full Course Walkthroughs</h2>
    <ul class="not-prose grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.walkthroughs as walkthrough (walkthrough.slug)}
        <Card
          title={walkthrough.title}
          description={walkthrough.description}
          url="/courses/{walkthrough.slug}"
          as="li"
        />
      {/each}
    </ul>
  </section>

  <section class="prose dark:prose-invert max-w-none">
    <h2>Recordings</h2>

    <p>
      I am lucky enough to teach a bunch of courses with my friends at <a
        href="https://frontendmasters.com/?utm_source=kinney&utm_medium=social&code=kinney"
        target="_blank">Frontend Masters</a
      >. We've been working together since 2016. Before I was a teacher, I was a customer back when
      I was learning the ropes. I can't recommend them highly enough. You can find the most
      up-to-date list
      <a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">here</a>.
    </p>
  </section>

  <ul class="not-prose grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
    {#each recordings as recording (recording.slug)}
      <Card
        title={recording.title}
        description={recording.description}
        url={recording.href}
        as="li"
      >
        {#if recording.duration}
          <p class="text-sm text-slate-500 dark:text-slate-400">{recording.duration}</p>
        {/if}
      </Card>
    {/each}
  </ul>
</div>
