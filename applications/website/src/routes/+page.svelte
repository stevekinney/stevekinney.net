<script lang="ts">
  import Card from '$lib/components/card';
  import Link from '$lib/components/link.svelte';
  import SEO from '$lib/components/seo.svelte';
  import courses from '$lib/courses';
  import formatDate from '$lib/format-date';
  import { description, title } from '$lib/metadata';
  import { buildPersonSchema, buildWebSiteSchema } from '$lib/structured-data';
  import { POSTS_PER_PAGE } from '$lib/pagination';
  import Biography from './biography.md';

  import selfPortraitAvif from '$assets/self-portrait.jpg?w=384;768&format=avif&as=srcset&withoutEnlargement';
  import selfPortraitSrc from '$assets/self-portrait.jpg?w=768';
  import selfPortraitMeta from '$assets/self-portrait.jpg?metadata';

  const { data } = $props();

  const recentPosts = $derived(data.posts.slice(0, POSTS_PER_PAGE));
  const hasMorePosts = $derived(data.posts.length > POSTS_PER_PAGE);

  const jsonLd = [buildWebSiteSchema(), buildPersonSchema()];
</script>

<SEO {title} {description} {jsonLd} />

<div class="space-y-10">
  <div class="grid grid-cols-1 gap-8 md:grid-cols-[1fr_fit]">
    <section class="space-y-4">
      <h2 class="text-xl font-bold">Recent Posts</h2>
      <ul class="space-y-2">
        {#each recentPosts as post (post.slug)}
          <li class="space-x-2">
            <Link href="/writing/{post.slug}">{post.title}</Link>
            <time class="text-primary-800 dark:text-primary-200 text-sm" datetime={post.date}>
              {formatDate(post.date)}
            </time>
          </li>
        {/each}
      </ul>
      {#if hasMorePosts}
        <p>
          <Link href="/writing">View all writing</Link>
        </p>
      {/if}
    </section>

    <picture>
      <source type="image/avif" srcset={selfPortraitAvif} sizes="(min-width: 768px) 384px, 288px" />
      <img
        src={selfPortraitSrc}
        width={selfPortraitMeta.width}
        height={selfPortraitMeta.height}
        class="block aspect-[3/4] max-w-full rounded-md shadow-lg sm:w-72 md:w-96"
        alt="Steve Kinney"
        fetchpriority="high"
        loading="eager"
        decoding="auto"
      />
    </picture>

    <Biography class="prose dark:prose-invert order-first max-w-none md:order-last md:col-span-2" />
  </div>

  <section class="prose dark:prose-invert max-w-none">
    <h2>Full Course Walkthroughs</h2>
    <ul>
      {#each data.walkthroughs as walkthrough (walkthrough.slug)}
        <li>
          <a href="/courses/{walkthrough.slug}">
            {walkthrough.title}
          </a>
        </li>
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
    {#each courses as course (course.href)}
      <Card title={course.title} description={course.description} url={course.href} as="li" />
    {/each}
  </ul>
</div>
