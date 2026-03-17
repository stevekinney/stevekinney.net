<script lang="ts">
  import Card from '$lib/components/card';
  import SEO from '$lib/components/seo.svelte';
  import courses from '$lib/courses';

  const { data } = $props();
</script>

<SEO title={data.title} description={data.description} />

<div class="space-y-8">
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
      I was learning the ropes. I can't recommend them highly enough. Below, I've listed out some of
      the courses that I've taught over the last few years. You can find the most up-to-date list
      <a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">here</a>.
    </p>
  </section>

  <ul class="not-prose grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
    {#each courses as course (course.href)}
      <Card title={course.title} description={course.description} url={course.href} as="li" />
    {/each}
  </ul>
</div>
