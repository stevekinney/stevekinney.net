<script lang="ts">
  import { onMount } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import DailyBalance from './daily-balance.svelte';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses } from './field-styles';
  import FooterNotes from './footer-notes.svelte';
  import { dailyBalance, defaultScenario, sweep } from './model';
  import type { NumericField, Scenario } from './model';
  import NumberField from './number-field.svelte';
  import SweepChart from './sweep-chart.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/review-capacity` },
  ]);

  const scenario = $state<Scenario>({ ...defaultScenario });
  // The page is prerendered, so the boxes exist before anything listens to them.
  let ready = $state(false);

  const balance = $derived(dailyBalance(scenario));
  const points = $derived(sweep(scenario));

  type FieldSpec = { field: NumericField; label: string; source: string; unit?: string };

  const fields: FieldSpec[] = [
    {
      field: 'agents',
      label: 'Parallel agents',
      source: 'Anthropic suggests three to five.',
    },
    {
      field: 'prsPerAgent',
      label: 'Pull requests per agent per day',
      source: 'Assumption. Can be fractional.',
    },
    {
      field: 'linesPerPr',
      label: 'Lines changed per pull request',
      source: 'Assumption. Additions plus deletions.',
      unit: 'lines',
    },
    {
      field: 'sittings',
      label: 'Good review sittings per day',
      source: 'Assumption. Each covers the lines per sitting below.',
    },
  ];

  onMount(() => {
    ready = true;
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      How many agents can you actually review?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Parallel agents multiply what gets written. What gets reviewed well is capped by your good
      sittings each day. Here are the two side by side.
    </p>
  </header>

  <section aria-labelledby="answer-heading" class="max-w-3xl space-y-4">
    <h2 id="answer-heading" class="sr-only">The answer</h2>
    <DailyBalance {balance} {scenario} />
  </section>

  <section aria-labelledby="inputs-heading" class="max-w-3xl space-y-4">
    <h2 id="inputs-heading" class={headingClasses}>Your numbers</h2>
    <div class="grid gap-6 sm:grid-cols-2">
      {#each fields as spec (spec.field)}
        <NumberField
          field={spec.field}
          label={spec.label}
          value={scenario[spec.field]}
          source={spec.source}
          unit={spec.unit}
          disabled={!ready}
          onChange={(value) => (scenario[spec.field] = value)}
        />
      {/each}
    </div>
    <details class="space-y-4">
      <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
        Assumptions
      </summary>
      <div class="pt-2">
        <NumberField
          field="linesPerSitting"
          label="Lines per good sitting"
          value={scenario.linesPerSitting}
          source="The Cisco case study puts the limit at 400."
          unit="lines"
          disabled={!ready}
          onChange={(value) => (scenario.linesPerSitting = value)}
        />
      </div>
    </details>
  </section>

  <section aria-labelledby="sweep-heading" class="max-w-3xl space-y-4">
    <div class="space-y-1">
      <h2 id="sweep-heading" class={headingClasses}>From one agent to ten</h2>
      <p class={bodyClasses}>Each agent past the line adds the same amount to the daily gap.</p>
    </div>
    <SweepChart {points} capacity={balance.capacity} current={scenario.agents} />
  </section>

  <FooterNotes />

  <p class="max-w-3xl text-slate-700 dark:text-slate-200">
    The other half of the trade:
    <a
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2 hover:no-underline"
      href="/experiments/delegation-economics">how much faster is fanning out?</a
    >
  </p>
</div>
