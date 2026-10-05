<script lang="ts">
  import { onMount } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { assessCache } from './calibrate';
  import type { Calibration } from './calibrate';
  import CompactionBreakdown from './compaction-breakdown.svelte';
  import { downloadText } from './download';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import HeroTiles from './hero-tiles.svelte';
  import { calibrationPatch, discardPatch, mergeBackup } from './import-state';
  import type { ImportedFields } from './import-state';
  import LazySection from '$lib/experiments/lazy-section.svelte';
  import { defaultModels, renamedModelId } from './pricing';
  import type { ModelPrice } from './pricing';
  import { project } from './projection';
  import ProjectionTable from './projection-table.svelte';
  import { estimateTokens } from './reread';
  import type { FileEstimate, SkippedFile } from './reread';
  import {
    clampLaterAfter,
    clampTo,
    defaultScenario,
    findModel,
    ranges,
    toProjectionInputs,
  } from './scenario';
  import type { Scenario, ScenarioField } from './scenario';
  import ScenarioControls from './scenario-controls.svelte';
  import { decodeScenario, encodeScenario } from './share-link';
  import SpendChart from './spend-chart.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/compact-or-clear` },
  ]);

  // One state object. Everything on the page is derived from it.
  const calculator = $state({
    scenario: { ...defaultScenario } as Scenario,
    models: defaultModels.map((model) => ({ ...model })) as ModelPrice[],
    calibration: null as Calibration | null,
    /** Fields still showing a value from the session, until the person edits them. */
    imported: {} as ImportedFields,
    backup: null as Partial<Scenario> | null,
    reread: {
      files: [] as FileEstimate[],
      skipped: [] as SkippedFile[],
      unchecked: {} as Record<string, true>,
      /** Whether the re-read size follows the checked files. */
      pinned: false,
    },
    pinnedTurn: null as number | null,
    priceTableOpen: false,
    ready: false,
    touched: false,
  });

  const scenario = $derived(calculator.scenario);
  const model = $derived(findModel(calculator.models, scenario.modelId));
  const inputs = $derived(toProjectionInputs(scenario, calculator.models));
  const laterAfter = $derived(
    scenario.laterEnabled ? clampLaterAfter(scenario.laterAfter, scenario.turns) : null,
  );
  const projection = $derived(project(inputs, laterAfter));

  const rereadTotal = $derived(
    calculator.reread.files.reduce(
      (sum, file) =>
        calculator.reread.unchecked[file.path]
          ? sum
          : sum + estimateTokens(file.characters, scenario.charsPerToken),
      0,
    ),
  );

  // The cache keeps aging while the page is open, so the assessment is measured against now, not
  // against the moment the files were read.
  let now = $state(Date.now());

  const assessment = $derived(
    calculator.calibration
      ? assessCache(calculator.calibration.lastTimestamp, now, scenario.ttl)
      : null,
  );

  // A cache setting that came from the session follows the assessment until the person sets it.
  $effect(() => {
    if (assessment && calculator.imported.warm && scenario.warm !== assessment.warm) {
      calculator.scenario.warm = assessment.warm;
    }
  });

  const markEdited = (fields: ScenarioField[]): void => {
    for (const field of fields) delete calculator.imported[field];
  };

  const syncReread = (): void => {
    calculator.scenario.reread = clampTo(ranges.reread, rereadTotal);
    delete calculator.imported.reread;
    calculator.touched = true;
  };

  /** A person changed a control. */
  const change = (patch: Partial<Scenario>): void => {
    const fields = Object.keys(patch) as ScenarioField[];
    Object.assign(calculator.scenario, patch);
    markEdited(fields);

    if (patch.turns !== undefined) {
      calculator.scenario.laterAfter = clampLaterAfter(calculator.scenario.laterAfter, patch.turns);
      if (calculator.pinnedTurn !== null && calculator.pinnedTurn > patch.turns) {
        calculator.pinnedTurn = null;
      }
    }

    // Moving the re-read size by hand unpins the estimate from the file list.
    if (patch.reread !== undefined) calculator.reread.pinned = false;

    // A calibrated cache setting follows the TTL until the person sets it.
    if (patch.ttl !== undefined && calculator.imported.warm && calculator.calibration) {
      const next = assessCache(calculator.calibration.lastTimestamp, Date.now(), patch.ttl);
      if (next) calculator.scenario.warm = next.warm;
    }

    if (patch.charsPerToken !== undefined && calculator.reread.pinned) syncReread();

    calculator.touched = true;
  };

  const applyCalibration = (calibration: Calibration): void => {
    // A second session replaces the first. Whatever the first filled in and the person hasn't
    // edited goes back first, so a field the new session can't measure doesn't keep the old value.
    Object.assign(calculator.scenario, discardPatch(calculator.backup, calculator.imported));
    calculator.imported = {};

    now = Date.now();
    const next = assessCache(calibration.lastTimestamp, now, scenario.ttl);
    const { patch, imported } = calibrationPatch(calibration, next);

    calculator.backup = mergeBackup(
      calculator.scenario,
      calculator.backup,
      calculator.imported,
      imported,
    );
    Object.assign(calculator.scenario, patch);
    Object.assign(calculator.imported, imported);
    calculator.calibration = calibration;
    calculator.touched = true;
  };

  const discardImport = (): void => {
    Object.assign(calculator.scenario, discardPatch(calculator.backup, calculator.imported));
    calculator.imported = {};
    calculator.backup = null;
    calculator.calibration = null;
    calculator.touched = true;
  };

  const setRereadEstimates = (files: FileEstimate[], skipped: SkippedFile[]): void => {
    calculator.reread.files = files;
    calculator.reread.skipped = skipped;
    calculator.reread.unchecked = {};
    calculator.reread.pinned = files.length > 0;
    if (files.length > 0) syncReread();
  };

  const toggleRereadFile = (path: string, checked: boolean): void => {
    if (checked) delete calculator.reread.unchecked[path];
    else calculator.reread.unchecked[path] = true;

    calculator.reread.pinned = true;
    syncReread();
  };

  const setRereadPinned = (pinned: boolean): void => {
    calculator.reread.pinned = pinned;
    if (pinned) syncReread();
  };

  const clearRereadList = (): void => {
    calculator.reread = { files: [], skipped: [], unchecked: {}, pinned: false };
  };

  const setModels = (models: ModelPrice[]): void => {
    const previous = calculator.models;
    calculator.models = models;
    if (!models.some((entry) => entry.id === calculator.scenario.modelId)) {
      const renamed = renamedModelId(previous, models, calculator.scenario.modelId);

      if (renamed) {
        calculator.scenario.modelId = renamed;
      } else {
        calculator.scenario.modelId = models[0]?.id ?? defaultScenario.modelId;
        delete calculator.imported.modelId;
      }
    }
    calculator.touched = true;
  };

  const pinTurn = (turn: number | null): void => {
    calculator.pinnedTurn = turn;
  };

  const focusControl = (id: string): void => {
    const element = document.getElementById(id);
    if (!element) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    element.focus({ preventScroll: true });
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

      const known = shared.scenario.modelId
        ? calculator.models.some((entry) => entry.id === shared.scenario.modelId)
        : true;
      Object.assign(calculator.scenario, shared.scenario, known ? {} : { modelId: undefined });
      if (!known) calculator.scenario.modelId = defaultScenario.modelId;
      calculator.scenario.laterAfter = clampLaterAfter(
        calculator.scenario.laterAfter,
        calculator.scenario.turns,
      );
    }

    calculator.ready = true;

    const timer = setInterval(() => (now = Date.now()), 15_000);

    return () => clearInterval(timer);
  });

  // Keep the address bar in step with the controls, once a person has changed one.
  $effect(() => {
    if (!calculator.ready || !calculator.touched) return;

    const query = encodeScenario(calculator.scenario, calculator.models);

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
      Compact or clear, and what it costs
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Compacting replaces your history with a summary. Clearing throws it away. Both are one-time
      costs that buy a cheaper rate on every turn after, because each turn re-reads the whole prefix
      from cache. This page projects all three paths forward from where your session is now, so you
      can see where each one crosses below the others.
    </p>
  </header>

  <HeroTiles
    {projection}
    turns={scenario.turns}
    warm={scenario.warm}
    baseline={scenario.baseline}
    contextNow={scenario.contextNow}
    {laterAfter}
  />

  <section aria-labelledby="calibrate-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="calibrate-heading" class={headingClasses}>Start from your own session</h2>
      <p class={bodyClasses}>
        Drop a Claude Code transcript and the scenario fills in with your real turn sizes, your
        cache’s state, and how much your compactions actually shrink the context.
      </p>
    </div>
    <LazySection
      name="the session reader"
      load={() => import('./calibration-panel.svelte')}
      props={{
        calibration: calculator.calibration,
        models: calculator.models,
        assessment,
        cacheOverridden: calculator.calibration !== null && !calculator.imported.warm,
        baseline: scenario.baseline,
        onCalibrated: applyCalibration,
        onDiscard: discardImport,
        onUseBaseline: (baseline: number) => change({ baseline }),
        onOpenPriceTable: () => {
          calculator.priceTableOpen = true;
          focusControl('price-table-heading');
        },
      }}
    />
  </section>

  <section aria-labelledby="scenario-heading" class={panelClasses}>
    <h2 id="scenario-heading" class={headingClasses}>Your scenario</h2>
    <ScenarioControls
      {scenario}
      models={calculator.models}
      imported={calculator.imported}
      baselineEstimate={calculator.calibration?.baselineEstimate ?? null}
      onChange={change}
    >
      {#snippet rereadBuilder()}
        <div class="space-y-3">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">Size the re-read</h3>
          <LazySection
            name="the file reader"
            load={() => import('./reread-builder.svelte')}
            props={{
              files: calculator.reread.files,
              skipped: calculator.reread.skipped,
              unchecked: calculator.reread.unchecked,
              charsPerToken: scenario.charsPerToken,
              pinned: calculator.reread.pinned,
              total: rereadTotal,
              reread: scenario.reread,
              onEstimates: setRereadEstimates,
              onToggle: toggleRereadFile,
              onPinChange: setRereadPinned,
              onClear: clearRereadList,
            }}
          />
        </div>
      {/snippet}
    </ScenarioControls>
  </section>

  <section aria-labelledby="chart-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="chart-heading" class={headingClasses}>Cumulative spend</h2>
      <p class="max-w-3xl {bodyClasses}">
        Dollars spent from now, turn by turn. Turn 0 is only the one-time cost. A dot marks where
        compacting or clearing first costs no more than keeping going.
      </p>
    </div>
    <SpendChart
      {projection}
      turns={scenario.turns}
      pinnedTurn={calculator.pinnedTurn}
      onPin={pinTurn}
    />
    <LazySection
      name="the export buttons"
      load={() => import('./share-actions.svelte')}
      props={{
        ready: calculator.ready,
        scenario,
        models: calculator.models,
        model,
        projection,
      }}
    />
  </section>

  <section aria-labelledby="breakdown-heading" class="space-y-4">
    <h2 id="breakdown-heading" class={headingClasses}>Where the compaction dollars go</h2>
    <CompactionBreakdown parts={projection.parts} warm={scenario.warm} />
  </section>

  <section aria-labelledby="table-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="table-heading" class={headingClasses}>Projected spend</h2>
      <p class="max-w-3xl {bodyClasses}">
        The chart’s numbers as a table. Pin a turn on the chart and it’s marked here.
      </p>
    </div>
    <ProjectionTable
      {projection}
      turns={scenario.turns}
      pinnedTurn={calculator.pinnedTurn}
      onPin={pinTurn}
    />
  </section>

  <section aria-labelledby="sensitivity-heading" class="space-y-4">
    <h2 id="sensitivity-heading" class={headingClasses}>What would change this answer</h2>
    <LazySection
      name="the sensitivity table"
      load={() => import('./sensitivity-panel.svelte')}
      props={{
        inputs,
        models: calculator.models,
        ttl: scenario.ttl,
        onFocusControl: focusControl,
      }}
    />
  </section>

  <section aria-labelledby="price-table-heading" class="space-y-4">
    <h2 id="price-table-heading" class={headingClasses} tabindex="-1">Prices</h2>
    <LazySection
      name="the price table"
      load={() => import('./price-table-panel.svelte')}
      props={{
        models: calculator.models,
        open: calculator.priceTableOpen,
        onOpenChange: (open: boolean) => (calculator.priceTableOpen = open),
        onChange: setModels,
        onDownload: downloadText,
      }}
    />
  </section>

  <section aria-labelledby="explanation-heading" class="space-y-6">
    <h2 id="explanation-heading" class={headingClasses}>How this is calculated</h2>
    <LazySection
      name="the explanation"
      load={() => import('./explanation.svelte')}
      props={{
        model,
        models: calculator.models,
        rates: inputs.rates,
        ttl: scenario.ttl,
        warm: scenario.warm,
      }}
    />
  </section>
</div>
