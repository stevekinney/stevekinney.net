<script lang="ts">
  import { onMount } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { durationGrid } from './agents';
  import {
    cloneConfig,
    defaultConfig,
    defaultStage,
    MAXIMUM_MANUAL_ITEMS,
    MAXIMUM_STAGES,
    resizeGrid,
    roundMinutes,
  } from './config';
  import type { DurationMode, StageConfig, WorkflowConfig } from './config';
  import CostPanel from './cost-panel.svelte';
  import { experiment } from './experiment';
  import { bodyClasses, codeClasses, headingClasses, panelClasses } from './field-styles';
  import GanttPanel from './gantt-panel.svelte';
  import LazySection from './lazy-section.svelte';
  import type { WorkflowModel } from './models';
  import PredictFirst from './predict-first.svelte';
  import PresetPicker from './preset-picker.svelte';
  import { findPreset } from './presets';
  import ResultsPanel from './results-panel.svelte';
  import { runWorkflow } from './run';
  import { decodeConfiguration, encodeConfiguration } from './share-link';
  import WhenNot from './when-not.svelte';
  import WorkflowControls from './workflow-controls.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/workflow-fan-out` },
  ]);

  // svelte-ignore state_referenced_locally
  const defaultModels: WorkflowModel[] = data.models;

  // One state object. Everything on the page is derived from it.
  const page = $state({
    config: defaultConfig() as WorkflowConfig,
    models: defaultModels.map((model) => ({ ...model })) as WorkflowModel[],
    presetId: null as string | null,
    ready: false,
    touched: false,
  });

  const config = $derived(page.config);
  const run = $derived(runWorkflow(page.config, page.models));
  const stageNames = $derived(page.config.stages.map((stage) => stage.name || 'Unnamed'));

  const edited = (): void => {
    page.presetId = null;
    page.touched = true;
  };

  const syncGrid = (): void => {
    if (page.config.durationMode === 'manual') {
      page.config.manual = resizeGrid(page.config.manual, page.config.items, page.config.stages);
    }
  };

  const change = (patch: Partial<WorkflowConfig>): void => {
    Object.assign(page.config, patch);
    if (patch.items !== undefined) syncGrid();
    edited();
  };

  const changeStage = (index: number, patch: Partial<StageConfig>): void => {
    Object.assign(page.config.stages[index], patch);
    edited();
  };

  const addStage = (): void => {
    if (page.config.stages.length >= MAXIMUM_STAGES) return;
    page.config.stages.push(defaultStage(page.config.stages.length));
    syncGrid();
    edited();
  };

  const removeStage = (): void => {
    if (page.config.stages.length <= 1) return;
    page.config.stages.pop();
    page.config.manual = page.config.manual.map((row) => row.slice(0, page.config.stages.length));
    edited();
  };

  /** Switches to the manual grid, starting from the durations on screen. */
  const toManual = (): void => {
    if (page.config.durationMode === 'manual') return;
    page.config.manual = durationGrid({
      ...page.config,
      items: Math.min(page.config.items, MAXIMUM_MANUAL_ITEMS),
    });
    page.config.durationMode = 'manual';
  };

  const setDurationMode = (mode: DurationMode): void => {
    if (mode === 'manual') toManual();
    else page.config.durationMode = 'generated';
    edited();
  };

  const setCell = (item: number, stage: number, minutes: number): void => {
    if (item >= MAXIMUM_MANUAL_ITEMS) return;
    toManual();
    page.config.manual[item][stage] = roundMinutes(minutes);
    edited();
  };

  const selectPreset = (id: string): void => {
    const preset = findPreset(id);
    if (!preset) return;
    page.config = preset.config();
    page.presetId = id;
    page.touched = true;
  };

  const changePrice = (
    id: string,
    patch: Partial<Pick<WorkflowModel, 'input' | 'output'>>,
  ): void => {
    const model = page.models.find((entry) => entry.id === id);
    if (model) Object.assign(model, patch);
    page.touched = true;
  };

  const resetPrices = (): void => {
    page.models = defaultModels.map((model) => ({ ...model }));
    page.touched = true;
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeConfiguration(window.location.hash.slice(1), defaultModels);
    if (shared) {
      page.config = cloneConfig(shared.config);
      for (const model of page.models) Object.assign(model, shared.prices[model.id] ?? {});
    }
    page.ready = true;
  });

  // Keep the address bar in step with the controls, once a person has changed one.
  $effect(() => {
    if (!page.ready || !page.touched) return;
    const query = encodeConfiguration(page.config, page.models, defaultModels);

    try {
      replaceState(`#${query}`, {});
    } catch {
      // The address bar is a convenience. The page works without it.
    }
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Workflow fan-out: pipeline() against parallel()
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      A workflow script sends a list of items through stages of agents. This page simulates that
      schedule both ways, shows what the results array really holds, estimates the cost by model,
      and checks a script you paste for the known sharp edges. Running everything in parallel isn’t
      the fastest choice, and a completed run doesn’t mean every item succeeded.
    </p>
  </header>

  <section aria-labelledby="predict-heading" class={panelClasses}>
    <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
    <PredictFirst ready={page.ready} onLoadPreset={selectPreset} />
  </section>

  <section aria-labelledby="setup-heading" class="space-y-6">
    <div class="space-y-1">
      <h2 id="setup-heading" class={headingClasses}>Set up the run</h2>
      <p class="max-w-3xl {bodyClasses}">Start from a preset, or change anything below.</p>
    </div>
    <PresetPicker selectedId={page.presetId} ready={page.ready} onSelect={selectPreset} />
    <details class="rounded-lg border border-slate-200 dark:border-slate-700" open>
      <summary
        class="focus-visible:outline-primary-600 cursor-pointer px-4 py-3 font-semibold text-slate-900 focus-visible:outline-2 dark:text-white"
      >
        Settings
      </summary>
      <div class="border-t border-slate-200 p-4 sm:p-6 dark:border-slate-700">
        <WorkflowControls
          {config}
          models={page.models}
          ready={page.ready}
          onChange={change}
          onStageChange={changeStage}
          onAddStage={addStage}
          onRemoveStage={removeStage}
          onCellChange={setCell}
          onDurationMode={setDurationMode}
        />
      </div>
    </details>
  </section>

  <section aria-labelledby="schedule-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="schedule-heading" class={headingClasses}>The schedule, both ways</h2>
      <p class="max-w-3xl {bodyClasses}">
        Rows are items and bars are agents. A vertical line marks when each run finishes. Seed {config.seed}.
      </p>
    </div>
    {#if run.runs}
      <GanttPanel runs={run.runs} {stageNames} ready={page.ready} onResize={setCell} />
    {:else}
      {#each run.refusals as refusal (refusal)}
        <p
          role="alert"
          class="rounded-lg border-l-4 border-red-600 bg-red-50 px-4 py-3 font-semibold text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100"
          data-testid="runtime-refusal"
        >
          {refusal}
        </p>
      {/each}
    {/if}
  </section>

  <section aria-labelledby="results-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="results-heading" class={headingClasses}>What the script receives</h2>
      <p class="max-w-3xl {bodyClasses}">
        The array <code class={codeClasses}>pipeline()</code> resolves to, item by item. Which way you
        handle nulls changes what you’re told.
      </p>
    </div>
    {#if run.runs}
      <ResultsPanel
        run={run.runs.pipeline}
        {stageNames}
        handling={config.handling}
        onHandlingChange={(handling) => change({ handling })}
      />
    {:else}
      <p class={bodyClasses}>No agent runs, so there are no results.</p>
    {/if}
  </section>

  <section aria-labelledby="cost-heading" class="space-y-4">
    <h2 id="cost-heading" class={headingClasses}>Cost and scale</h2>
    <CostPanel
      {config}
      {run}
      models={page.models}
      {defaultModels}
      ready={page.ready}
      onPriceChange={changePrice}
      onResetPrices={resetPrices}
    />
    <LazySection
      name="the copy buttons"
      load={() => import('./share-actions.svelte')}
      props={{ ready: page.ready, config, run, models: page.models, defaultModels }}
    />
  </section>

  <section aria-labelledby="linter-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="linter-heading" class={headingClasses}>Check a script</h2>
      <p class="max-w-3xl {bodyClasses}">
        Paste or drop a workflow script for a heuristic check of the sharp edges on this page.
      </p>
    </div>
    <LazySection
      name="the script checker"
      load={() => import('./script-linter.svelte')}
      props={{}}
    />
  </section>

  <section aria-labelledby="when-not-heading" class="space-y-4">
    <h2 id="when-not-heading" class={headingClasses}>When not to use a workflow</h2>
    <WhenNot />
  </section>

  <section aria-labelledby="concepts-heading" class="space-y-4">
    <h2 id="concepts-heading" class={headingClasses}>The concepts, and where they come from</h2>
    <LazySection
      name="the explanation"
      load={() => import('./explanation-footer.svelte')}
      props={{}}
    />
  </section>
</div>
