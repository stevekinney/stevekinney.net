<script lang="ts">
  import { onMount } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { answerText, bestWorkersText, detailText } from './display';
  import { evaluate, speedupCurve } from './economics';
  import { experiment } from './experiment';
  import Explanation from './explanation.svelte';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import PipelineGantt from './pipeline-gantt.svelte';
  import PresetPicker from './preset-picker.svelte';
  import { applyPreset, findPreset } from './presets';
  import type { PresetId } from './presets';
  import { findModel } from './pricing';
  import { defaultScenario, toInputs } from './scenario';
  import type { Scenario } from './scenario';
  import ScenarioControls from './scenario-controls.svelte';
  import SpeedupChart from './speedup-chart.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/delegation-economics` },
  ]);

  // svelte-ignore state_referenced_locally
  const { pricing } = data;

  let scenario = $state<Scenario>(defaultScenario(pricing.defaultModelId));
  let presetId = $state<PresetId | null>(null);
  let ready = $state(false);

  const inputs = $derived(toInputs(scenario, findModel(pricing.models, scenario.modelId)));
  const evaluation = $derived(evaluate(inputs));
  const curve = $derived(speedupCurve(inputs));

  const change = (patch: Partial<Scenario>): void => {
    Object.assign(scenario, patch);
    presetId = null;
  };

  const selectPreset = (id: PresetId): void => {
    const chosen = findPreset(id);
    if (!chosen) return;

    scenario = applyPreset(chosen, scenario);
    presetId = id;
  };

  onMount(() => {
    ready = true;
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      How much faster is fanning out?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Splitting a task across subagents feels like it should make it proportionally faster at about
      the same cost. It doesn’t. Serial work caps the speedup, integrating each worker’s report is
      serial too, and every worker reads the shared context for itself.
    </p>
  </header>

  <section aria-labelledby="answer-heading" class="space-y-4" data-testid="answer">
    <h2 id="answer-heading" class="sr-only">The answer</h2>
    <div class="max-w-3xl space-y-2">
      <p
        class="text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white"
        data-testid="answer-line"
      >
        {answerText(evaluation)}
      </p>
      <p class={bodyClasses} data-testid="answer-detail">
        {#if evaluation.workers > 1}
          {detailText(evaluation)} Each worker reads the {formatTokens(scenario.sharedTokens)} of shared
          context for itself, so it’s paid {evaluation.workers} times.
        {/if}
        {bestWorkersText(evaluation)}
      </p>
    </div>

    <SpeedupChart
      {curve}
      workers={evaluation.workers}
      bestWorkers={evaluation.best.workers}
      ceiling={evaluation.ceiling}
      onSelect={(workers: number) => change({ workers })}
    />
  </section>

  <section aria-labelledby="scenario-heading" class={panelClasses}>
    <h2 id="scenario-heading" class={headingClasses}>Your task</h2>
    <PresetPicker selected={presetId} {ready} onSelect={selectPreset} />
    <ScenarioControls {scenario} models={pricing.models} onChange={change} />
  </section>

  <section aria-labelledby="handoff-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="handoff-heading" class={headingClasses}>Don’t make every item wait</h2>
      <p class={bodyClasses}>
        When work runs in stages, how items move between them matters as much as how many workers
        you have. Waiting for every item to finish one stage before starting the next means each
        stage takes as long as its slowest item. Passing each item along lets the slow ones overlap.
        Only wait when the next stage really needs all of the previous results, such as
        deduplicating findings.
      </p>
    </div>
    <PipelineGantt {ready} />
  </section>

  <section aria-labelledby="when-not-heading" class="space-y-3">
    <h2 id="when-not-heading" class={headingClasses}>When not to delegate</h2>
    <ul class="max-w-3xl list-disc space-y-1 pl-5 {bodyClasses}">
      <li>
        The task is smaller than the handoff: writing the brief and reading the report costs more.
      </li>
      <li>Every worker needs the same context, and it’s still changing.</li>
      <li>The interface the workers share isn’t settled yet.</li>
      <li>Integration eats the parallel savings, which the chart above shows as the downturn.</li>
      <li>There’s no independent test to tell you which results to accept.</li>
    </ul>
  </section>

  <section aria-labelledby="explanation-heading" class="space-y-4">
    <h2 id="explanation-heading" class={headingClasses}>How this is calculated</h2>
    <Explanation />
  </section>

  <p class={bodyClasses}>
    Faster output still has to be reviewed: see <a
      href="/experiments/review-capacity"
      class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
      >how much agent output you can actually review</a
    >.
  </p>
</div>
