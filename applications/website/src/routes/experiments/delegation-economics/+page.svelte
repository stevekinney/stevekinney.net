<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import type { SpawnCalibration } from './calibrate';
  import { noChecks, verdict as judge } from './checklist';
  import type { Checks, ManualChecklistId } from './checklist';
  import ChecklistPanel from './checklist-panel.svelte';
  import { toPlan } from './compare';
  import type { Plan } from './compare';
  import { bestWorkersText, formatMultiplier } from './display';
  import { evaluate, speedupCurve, TEAM_SIZE_WARNING } from './economics';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import LazySection from './lazy-section.svelte';
  import PredictCard from './predict-card.svelte';
  import { comparePrediction, describeScenario } from './prediction';
  import type { PredictionResult } from './prediction';
  import PresetPicker from './preset-picker.svelte';
  import { applyPreset, findPreset } from './presets';
  import type { PresetId } from './presets';
  import type { WorkerModel } from './pricing';
  import ResultTiles from './result-tiles.svelte';
  import { defaultScenario, ranges, clampTo, selectedModel, toInputs } from './scenario';
  import type { Scenario } from './scenario';
  import ScenarioControls from './scenario-controls.svelte';
  import { decodeScenario, encodeScenario } from './share-link';
  import SpeedupChart from './speedup-chart.svelte';
  import TokenBreakdown from './token-breakdown.svelte';

  const { data } = $props();

  const path = '/experiments/delegation-economics';
  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}${path}` },
  ]);

  // svelte-ignore state_referenced_locally
  const { pricing } = data;
  const standardModels: WorkerModel[] = pricing.models;

  // One state object. Everything on the page is derived from it.
  const calculator = $state({
    scenario: defaultScenario(pricing.defaultModelId) as Scenario,
    models: standardModels.map((model) => ({ ...model })) as WorkerModel[],
    checks: { ...noChecks } as Checks,
    presetId: null as PresetId | null,
    prediction: {
      revealed: false,
      /** The person chose “Just show me”, so presets don't ask again. */
      skipped: false,
      result: null as PredictionResult | null,
      description: null as string | null,
    },
    pinned: null as Plan | null,
    calibration: null as SpawnCalibration | null,
    /** Whether the spawn overhead is still the median measured from uploaded sessions. */
    spawnFromSessions: false,
    nesting: { perNode: 4, layers: 3 },
    ready: false,
    touched: false,
  });

  const scenario = $derived(calculator.scenario);
  const model = $derived(selectedModel(calculator.models, scenario));
  const inputs = $derived(toInputs(scenario, model));
  const evaluation = $derived(evaluate(inputs));
  const curve = $derived(speedupCurve(inputs));
  const verdict = $derived(judge(calculator.checks, evaluation));
  const preset = $derived(calculator.presetId ? findPreset(calculator.presetId) : undefined);
  const revealed = $derived(calculator.prediction.revealed);

  /** A person changed a control. */
  const change = (patch: Partial<Scenario>): void => {
    Object.assign(calculator.scenario, patch);
    if (patch.spawnTokens !== undefined) calculator.spawnFromSessions = false;
    calculator.presetId = null;
    calculator.touched = true;
  };

  const resetPrediction = (): void => {
    calculator.prediction = { revealed: false, skipped: false, result: null, description: null };
  };

  const selectPreset = (id: PresetId): void => {
    const chosen = findPreset(id);
    if (!chosen) return;

    calculator.scenario = applyPreset(chosen, calculator.scenario);
    calculator.presetId = id;
    calculator.spawnFromSessions = false;
    calculator.touched = true;
    // The first presets are the ones where the plausible answer is wrong, so ask again.
    if (!calculator.prediction.skipped) resetPrediction();
  };

  const reveal = (guess: number): void => {
    calculator.prediction = {
      revealed: true,
      skipped: false,
      result: evaluation.speedup === null ? null : comparePrediction(guess, evaluation.speedup),
      description: describeScenario(scenario),
    };
  };

  const skip = (): void => {
    calculator.prediction = { revealed: true, skipped: true, result: null, description: null };
  };

  const setModels = (models: WorkerModel[]): void => {
    calculator.models = models;
    if (!models.some((entry) => entry.id === calculator.scenario.modelId)) {
      calculator.scenario.modelId = models[0]?.id ?? pricing.defaultModelId;
    }
    calculator.touched = true;
  };

  const useSpawnOverhead = (tokens: number): void => {
    calculator.scenario.spawnTokens = clampTo(ranges.spawnTokens, tokens);
    calculator.spawnFromSessions = true;
    calculator.presetId = null;
    calculator.touched = true;
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeScenario(window.location.hash.slice(1));

    if (shared) {
      const { customModel } = shared;

      if (customModel) {
        const exists = calculator.models.some((entry) => entry.id === customModel.id);
        calculator.models = exists
          ? calculator.models.map((entry) => (entry.id === customModel.id ? customModel : entry))
          : [...calculator.models, customModel];
      }

      const known =
        !shared.scenario.modelId ||
        calculator.models.some((entry) => entry.id === shared.scenario.modelId);
      Object.assign(calculator.scenario, shared.scenario);
      if (!known) calculator.scenario.modelId = pricing.defaultModelId;

      // Whoever shared the link already made their prediction.
      calculator.prediction = { revealed: true, skipped: true, result: null, description: null };
    }

    calculator.ready = true;
  });

  // Keep the address bar in step with the controls, once a person has changed one.
  $effect(() => {
    if (!calculator.ready || !calculator.touched) return;

    const query = encodeScenario(calculator.scenario, calculator.models, standardModels);

    try {
      // SvelteKit's own replaceState, because writing to window.history directly
      // conflicts with its router.
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
      Should I fan out?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Splitting a task across subagents feels like it should make it proportionally faster at about
      the same cost. It doesn’t. Serial work caps the speedup, integration is serial too, and every
      worker pays to spawn and to read the context it shares with the others. This page puts the
      time, the tokens, and the dollars side by side so you can see the trade before you make it.
    </p>
  </header>

  <PredictCard
    description={describeScenario(scenario)}
    integrationMinutes={scenario.integrationMinutes}
    workers={scenario.workers}
    ready={calculator.ready}
    {revealed}
    result={calculator.prediction.result}
    revealedDescription={calculator.prediction.description}
    onReveal={reveal}
    onSkip={skip}
    onReset={resetPrediction}
  />

  <section aria-labelledby="presets-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="presets-heading" class={headingClasses}>Presets</h2>
      <p class={bodyClasses}>
        The first two are the ones where the plausible answer is wrong. Pick one and predict again.
      </p>
    </div>
    <PresetPicker selected={calculator.presetId} ready={calculator.ready} onSelect={selectPreset} />
    {#if preset?.anecdote}
      <aside
        class="max-w-3xl rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        data-testid="preset-anecdote"
      >
        <p class="font-semibold text-slate-900 dark:text-white">Cited, not computed</p>
        <p class="mt-1">{preset.anecdote.text}</p>
        <p class="mt-1">
          Source:
          <a
            href={preset.anecdote.href}
            class="text-primary-700 dark:text-primary-300 underline underline-offset-2"
            >{preset.anecdote.source}</a
          >, via the course outline. The numbers below come from this page’s model, not the report.
        </p>
      </aside>
    {/if}
  </section>

  {#if revealed}
    <section aria-labelledby="results-heading" class="space-y-4" data-testid="results">
      <h2 id="results-heading" class={headingClasses}>
        {evaluation.workers === 1
          ? 'One worker against one session'
          : `${evaluation.workers} ${scenario.mode === 'subagents' ? 'workers' : 'teammates'} against one session`}
      </h2>
      <ResultTiles {evaluation} {inputs} {model} />
      {#if evaluation.teamTooLarge}
        <p
          role="status"
          class="flex items-start gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200"
        >
          <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          <span>
            Warning: agent teams are recommended at three to five teammates. This has {evaluation.workers},
            more than {TEAM_SIZE_WARNING}, and the multiplier was measured on a team of three.
          </span>
        </p>
      {/if}
      <p class={bodyClasses} data-testid="best-workers">
        {bestWorkersText(evaluation)}
        {#if evaluation.continuousOptimum !== null}
          Treating workers as continuous, the optimum is {evaluation.continuousOptimum.toFixed(2)}.
        {:else}
          With no integration time, every added worker helps a little.
        {/if}
        {evaluation.ceiling === null
          ? 'With no serial work, there’s no ceiling.'
          : `However many workers you add, it’s never faster than ${formatMultiplier(evaluation.ceiling)}.`}
      </p>
    </section>
  {/if}

  <section aria-labelledby="scenario-heading" class={panelClasses}>
    <h2 id="scenario-heading" class={headingClasses}>Your scenario</h2>
    <ScenarioControls
      {scenario}
      models={calculator.models}
      spawnFromSessions={calculator.spawnFromSessions}
      onChange={change}
    />
  </section>

  {#if revealed}
    <section aria-labelledby="curve-heading" class="space-y-4">
      <div class="max-w-3xl space-y-1">
        <h2 id="curve-heading" class={headingClasses}>Speedup by workers</h2>
        <p class={bodyClasses}>
          The dotted line is Amdahl’s law alone. The solid line adds integration, which is why it
          turns down past the best worker count.
        </p>
      </div>
      <SpeedupChart
        {curve}
        workers={evaluation.workers}
        bestWorkers={evaluation.best.workers}
        ceiling={evaluation.ceiling}
        onSelect={(workers) => change({ workers })}
      />
    </section>

    <section aria-labelledby="breakdown-heading" class="space-y-4">
      <div class="max-w-3xl space-y-1">
        <h2 id="breakdown-heading" class={headingClasses}>Where the tokens go</h2>
        <p class={bodyClasses}>
          The shared context is drawn once per worker, so you can see how often you pay for it.
        </p>
      </div>
      <TokenBreakdown {evaluation} {inputs} />
    </section>

    <section aria-labelledby="checklist-heading" class="space-y-4">
      <h2 id="checklist-heading" class={headingClasses}>When not to delegate</h2>
      <ChecklistPanel
        checks={calculator.checks}
        {evaluation}
        {verdict}
        onToggle={(id: ManualChecklistId, checked: boolean) => {
          calculator.checks[id] = checked;
        }}
      />
    </section>

    <section aria-labelledby="plans-heading" class="space-y-4">
      <h2 id="plans-heading" class={headingClasses}>Compare and share</h2>
      <LazySection
        name="the compare and share tools"
        load={() => import('./share-actions.svelte')}
        props={{
          ready: calculator.ready,
          scenario,
          models: calculator.models,
          standardModels,
          model,
          evaluation,
          verdict,
          current: toPlan(scenario, evaluation),
          pinned: calculator.pinned,
          onPin: () => {
            calculator.pinned = toPlan(scenario, evaluation);
          },
          onUnpin: () => {
            calculator.pinned = null;
          },
        }}
      />
    </section>
  {/if}

  <section aria-labelledby="calibrate-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="calibrate-heading" class={headingClasses}>
        Measure spawn overhead from your sessions
      </h2>
      <p class={bodyClasses}>
        Claude Code writes every subagent’s transcript to disk. Choose some, and this page measures
        what each subagent had in context before it did any work.
      </p>
    </div>
    <LazySection
      name="the session reader"
      load={() => import('./calibration-panel.svelte')}
      props={{
        calibration: calculator.calibration,
        spawnTokens: scenario.spawnTokens,
        onCalibrated: (calibration: SpawnCalibration) => {
          calculator.calibration = calibration;
        },
        onUse: useSpawnOverhead,
        onDiscard: () => {
          calculator.calibration = null;
          calculator.spawnFromSessions = false;
        },
      }}
    />
  </section>

  <section aria-labelledby="nesting-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="nesting-heading" class={headingClasses}>When workers spawn workers</h2>
      <p class={bodyClasses}>
        A worker with the Agent tool can delegate too. Count what a tree of them adds up to.
      </p>
    </div>
    <LazySection
      name="the nesting calculator"
      load={() => import('./nesting-panel.svelte')}
      props={{
        perNode: calculator.nesting.perNode,
        layers: calculator.nesting.layers,
        onChange: (patch: { perNode?: number; layers?: number }) => {
          Object.assign(calculator.nesting, patch);
        },
      }}
    />
  </section>

  <section aria-labelledby="prices-heading" class="space-y-4">
    <h2 id="prices-heading" class={headingClasses}>Prices</h2>
    <LazySection
      name="the price table"
      load={() => import('./price-table-panel.svelte')}
      props={{
        models: calculator.models,
        standardModels,
        updated: pricing.updated,
        onChange: setModels,
      }}
    />
  </section>

  <section aria-labelledby="explanation-heading" class="space-y-6">
    <h2 id="explanation-heading" class={headingClasses}>How this is calculated</h2>
    <LazySection name="the explanation" load={() => import('./explanation.svelte')} props={{}} />
  </section>
</div>
