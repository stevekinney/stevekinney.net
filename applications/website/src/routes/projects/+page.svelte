<script lang="ts">
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([{ name: 'Projects', url: `${url}/projects` }]);
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<section class="space-y-8">
  <hgroup class="space-y-3">
    <h1 class="text-3xl font-bold">Projects</h1>
    <p class="max-w-3xl font-serif text-2xl text-slate-700 dark:text-slate-300">
      {data.description}
    </p>
  </hgroup>

  <div class="grid gap-5 md:grid-cols-2">
    {#each data.projects as project (project.slug)}
      <article class="space-y-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div class="space-y-2">
          <h2 class="text-xl font-bold">
            <a
              class="decoration-primary-600 hover:text-primary-800 dark:hover:text-primary-200 font-semibold decoration-4 underline-offset-8 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 focus:outline-none dark:decoration-slate-400"
              href={project.path}
            >
              {project.name}
            </a>
          </h2>
          <p class="text-slate-700 dark:text-slate-300">{project.description}</p>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a
            class="font-semibold underline decoration-2 underline-offset-4"
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          {#if project.productionUrl}
            <a
              class="font-semibold underline decoration-2 underline-offset-4"
              href={project.productionUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Production
            </a>
          {/if}
          {#if project.writingPath}
            <a
              class="font-semibold underline decoration-2 underline-offset-4"
              href={project.writingPath}
            >
              Writing
            </a>
          {/if}
        </div>
      </article>
    {/each}
  </div>
</section>
