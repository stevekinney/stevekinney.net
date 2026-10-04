<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([{ name: 'Experiments', url: `${url}/experiments` }]);
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<section class="space-y-8">
  <hgroup class="space-y-3">
    <h1 class="text-3xl font-bold">Experiments</h1>
    <p class="max-w-3xl font-serif text-2xl text-slate-700 dark:text-slate-300">
      {data.description}
    </p>
  </hgroup>

  <div class="grid gap-5 md:grid-cols-2">
    {#each data.experiments as experiment (experiment.slug)}
      <article class="space-y-2 border-b border-slate-200 pb-5 dark:border-slate-800">
        <h2 class="text-xl font-bold">
          <a
            class="decoration-primary-600 hover:text-primary-800 dark:hover:text-primary-200 focus:ring-primary-600 font-semibold decoration-4 underline-offset-8 focus:ring-2 focus:ring-offset-2 focus:outline-none dark:decoration-slate-400"
            href={experiment.path}
          >
            {experiment.title}
          </a>
        </h2>
        <p class="text-slate-700 dark:text-slate-300">{experiment.description}</p>
      </article>
    {/each}
  </div>
</section>
