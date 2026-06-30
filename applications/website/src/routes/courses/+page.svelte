<script lang="ts">
  import Card from '$lib/components/card';
  import SEO from '$lib/components/seo.svelte';
  import coursesData from '$lib/courses.toml';
  import type { Recording } from '$lib/recording-types';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  const recordings = coursesData.recording as Recording[];

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([{ name: 'Courses', url: `${url}/courses` }]);
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
  <aside class="space-y-4" aria-labelledby="walkthroughs-heading">
    <h2 id="walkthroughs-heading" class="prose dark:prose-invert text-2xl font-bold">
      Full Course Walkthroughs
    </h2>
    <ul class="space-y-4">
      {#each data.walkthroughs as walkthrough (walkthrough.slug)}
        <li>
          <a
            href="/courses/{walkthrough.slug}"
            class="decoration-primary-700 font-semibold underline-offset-2 hover:underline"
          >
            {walkthrough.title}
          </a>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {walkthrough.description}
          </p>
        </li>
      {/each}
    </ul>
  </aside>

  <section class="space-y-6">
    <div class="prose dark:prose-invert max-w-none">
      <h2>Recordings</h2>

      <p>
        I am lucky enough to teach a bunch of courses with my friends at <a
          href="https://master.dev/"
          target="_blank">Master.dev</a
        >. We've been working together since 2016. Before I was a teacher, I was a customer back
        when I was learning the ropes. I can't recommend them highly enough. Below, I've listed out
        the courses that I've taught over the last few years. You can find the most up-to-date list
        <a href="https://master.dev/teachers/steve-kinney/" target="_blank">here</a>.
      </p>
    </div>

    <ul class="not-prose grid gap-10 sm:grid-cols-2">
      {#each recordings as recording (recording.slug)}
        <Card
          title={recording.title}
          description={recording.description}
          url={recording.href}
          imageSource={recording.imageSource}
          imageAlternativeText={recording.title}
          as="li"
        >
          {#if recording.duration}
            <p class="text-sm text-slate-500 dark:text-slate-400">{recording.duration}</p>
          {/if}
        </Card>
      {/each}
    </ul>
  </section>
</div>
