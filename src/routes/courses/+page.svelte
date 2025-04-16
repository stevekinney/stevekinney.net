<script lang="ts">
  import Card from '$lib/components/card';
  import courses from '$lib/courses';

  const { data } = $props();
</script>

<div class="space-y-8">
  <section class="prose dark:prose-invert">
    <h2>Full Course Walkthroughs</h2>
    <ul>
      {#each data.walkthroughs as walkthrough}
        <li>
          <a href="/courses/{walkthrough.slug}">
            {walkthrough.title}
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <section class="prose dark:prose-invert">
    <h2>Recordings</h2>

    <p>
      I am lucky enough to teach a bunch of courses with my friends at <a
        href="https://frontendmasters.com"
        target="_blank">Frontend Masters</a
      >. We've been working together since 2016. Before I was a teacher, I was a customer back when
      I was learning the ropes. I can't recommend them highly enough. Below, I've listed out some of
      the courses that I've taught over the last few years. You can find the most up-to-date list
      <a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">here</a>.
    </p>
  </section>

  <ul class="not-prose grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
    {#each courses as course}
      <Card title={course.title} description={course.description} url={course.href} as="li" />
    {/each}
  </ul>
</div>
