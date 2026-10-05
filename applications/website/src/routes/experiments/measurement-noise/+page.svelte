<script lang="ts">
  import { onMount, untrack } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import { focusAfterUpdate } from '$lib/experiments/focus-after-update';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { analyze, compareMeans, splitRows } from './analysis';
  import type { Endpoint } from './analysis';
  import AnalysisControls from './analysis-controls.svelte';
  import {
    BOOTSTRAP_RESAMPLES,
    costPerAcceptedJob,
    DEFAULT_SEED,
    medianDifferenceJob,
    runInSlices,
  } from './bootstrap';
  import type { BootstrapInterval } from './bootstrap';
  import type { BootstrapView } from './bootstrap-panel.svelte';
  import { describeColumns, guessMapping, hasOutcome } from './columns';
  import type { ColumnMapping, Role } from './columns';
  import type { InputMode } from './data-panel.svelte';
  import { buildDataset, swapConditions } from './dataset';
  import { emptyGrid, gridToTable } from './entry-grid';
  import type { GridState } from './entry-grid';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import FooterNotes from './footer-notes.svelte';
  import LazySection from './lazy-section.svelte';
  import { buildOutcomes } from './outcomes';
  import type { CostIntervalState } from './outcomes';
  import { parseCsv, parsePasted } from './parse-table';
  import type { ParsedTable } from './parse-table';
  import PredictCard from './predict-card.svelte';
  import type { Prediction } from './predict-card.svelte';
  import PresetPicker from './preset-picker.svelte';
  import { DEFAULT_PRESET, findPreset } from './presets';
  import type { PresetId } from './presets';
  import { readDataFile } from './read-data-file';
  import { decodeSettings, encodeSettings } from './share-link';
  import VerdictBanner from './verdict-banner.svelte';
  import { describeVerdict, endpointUnit } from './verdict';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/measurement-noise` },
  ]);

  type Active = 'preset' | 'paste' | 'file' | 'grid';

  // The question in "Predict first" is always about the five-tasks preset.
  const predictTable = parseCsv(findPreset('five-unpaired')?.csv ?? '');
  const predictAnalysis = analyze(
    predictTable.ok
      ? buildDataset(predictTable.table, guessMapping(predictTable.table.columns))
      : buildDataset({ columns: [], rows: [] }, guessMapping([])),
    { minutes: true, rework: false, reviewMinutes: false },
    { endpoint: 'time', preferPaired: true, alpha: 0.05, power: 0.8 },
  );

  // One state object. Every figure on the page is derived from it.
  const app = $state({
    active: 'preset' as Active,
    presetId: DEFAULT_PRESET as PresetId,
    mode: 'upload' as InputMode,
    pasteText: '',
    grid: emptyGrid() as GridState,
    file: null as { name: string; parsed: ParsedTable } | null,
    /** A mapping the person chose, kept only while the columns it was chosen for are on screen. */
    mapping: null as { key: string; mapping: ColumnMapping } | null,
    swapped: false,
    endpoint: 'time' as Endpoint,
    paired: true,
    seed: DEFAULT_SEED,
    alpha: 0.05,
    power: 0.8,
    sigma: null as number | null,
    delta: null as number | null,
    felt: null as number | null,
    prediction: null as Prediction | null,
    revealed: false,
    /** Set when a link arrived from someone's own data, which it doesn't carry. */
    linkLeftOutData: false,
    ready: false,
    touched: false,
  });

  const parsed = $derived.by((): ParsedTable => {
    switch (app.active) {
      case 'paste':
        return parsePasted(app.pasteText);
      case 'file':
        return app.file?.parsed ?? { ok: false, error: 'Choose a file to read.' };
      case 'grid':
        return { ok: true, table: gridToTable(app.grid) };
      default:
        return parseCsv(findPreset(app.presetId)?.csv ?? '');
    }
  });

  const table = $derived(parsed.ok ? parsed.table : { columns: [], rows: [] });
  const columnsKey = $derived(`${app.active}\u0000${table.columns.join('\u0000')}`);
  const mapping = $derived(
    app.mapping?.key === columnsKey ? app.mapping.mapping : guessMapping(table.columns),
  );
  const dataset = $derived.by(() => {
    const built = buildDataset(table, mapping);

    return app.swapped ? swapConditions(built) : built;
  });
  const report = $derived(describeColumns(table.columns, mapping));
  const outcomePresent = $derived(hasOutcome(mapping));

  const analysis = $derived(
    analyze(
      dataset,
      {
        minutes: mapping.minutes !== null,
        rework: mapping.rework !== null,
        reviewMinutes: mapping.reviewMinutes !== null,
      },
      { endpoint: app.endpoint, preferPaired: app.paired, alpha: app.alpha, power: app.power },
    ),
  );
  const verdict = $derived(describeVerdict(analysis));
  const labels = $derived(
    dataset.labels.length === 2 ? dataset.labels : [dataset.labels[0] ?? 'A', 'B'],
  );
  const meanComparison = $derived(
    analysis.comparison?.kind === 'mean' ? analysis.comparison : null,
  );

  // The perception chart always compares time, whatever the verdict's endpoint.
  const timeComparison = $derived.by(() => {
    if (analysis.endpoint === 'time' && meanComparison) return meanComparison;
    if (mapping.minutes === null || dataset.labels.length < 2) return null;

    const [rowsA, rowsB] = splitRows(dataset);

    return compareMeans(rowsA, rowsB, dataset.labels, (row) => row.minutes, app.paired);
  });
  const measuredSpeedup = $derived(
    timeComparison
      ? {
          percent: timeComparison.percent,
          lower: (timeComparison.test.lower / timeComparison.test.meanA) * 100,
          upper: (timeComparison.test.upper / timeComparison.test.meanA) * 100,
        }
      : null,
  );

  // The planner follows the data until the person moves a slider.
  const planner = $derived({
    sigma: app.sigma ?? (meanComparison && meanComparison.sigma > 0 ? meanComparison.sigma : 10),
    delta:
      app.delta ??
      (meanComparison && meanComparison.test.difference !== 0
        ? Math.abs(meanComparison.test.difference)
        : 5),
    paired: meanComparison?.design === 'paired',
  });

  // The bootstrap runs in slices after the data settles, so a large file never freezes the page.

  let bootstrap = $state<BootstrapView>({
    status: 'idle',
    completed: 0,
    total: BOOTSTRAP_RESAMPLES,
    result: null,
    previous: null,
    reason: null,
  });
  let costInterval = $state<CostIntervalState>(null);
  let runId = 0;
  let lastDataKey = '';
  /** The data and seed of the last run that finished, so an identical rerun can be skipped. */
  let finishedKey = '';

  $effect(() => {
    if (!app.ready) return;

    const comparison = meanComparison;
    const seed = app.seed;
    const [rowsA, rowsB] = splitRows(dataset);
    const costs = (rows: typeof rowsA) =>
      rows.flatMap((row) =>
        row.cost !== null && row.accepted !== null
          ? [{ cost: row.cost, accepted: row.accepted }]
          : [],
      );
    const costsA = costs(rowsA);
    const costsB = costs(rowsB);
    // The costs belong in the key by value, not just by count: new costs with the same
    // durations still need a new cost-per-accepted interval.
    const costKey = (records: typeof costsA): string =>
      records.map((record) => `${record.cost}${record.accepted ? '+' : '-'}`).join(',');
    const dataKey = comparison
      ? `${comparison.design}|${comparison.valuesA.join(',')}|${comparison.valuesB.join(',')}|${costKey(costsA)}|${costKey(costsB)}`
      : '';
    // A recomputed analysis with the same data and seed, such as after changing α, needs no new
    // run once the last one has finished.
    if (comparison && `${dataKey}#${seed}` === finishedKey) return;

    const id = (runId += 1);

    untrack(() => {
      if (!comparison) {
        bootstrap = {
          ...bootstrap,
          status: 'not-applicable',
          result: null,
          previous: null,
          reason:
            analysis.endpoint === 'rework'
              ? 'The bootstrap compares medians, which don’t mean anything for a yes-or-no outcome like rework. Switch the endpoint to time or review minutes.'
              : 'There’s nothing to resample until each condition has at least two tasks.',
        };
        lastDataKey = '';
      }
    });

    const timer = setTimeout(async () => {
      if (comparison) {
        const prior = untrack(() => bootstrap.result);
        const previous: BootstrapInterval | null =
          dataKey === lastDataKey && prior && prior.seed !== seed ? prior : null;
        lastDataKey = dataKey;
        finishedKey = '';
        bootstrap = {
          status: 'running',
          completed: 0,
          total: BOOTSTRAP_RESAMPLES,
          result: null,
          previous,
          reason: null,
        };

        const result = await runInSlices(
          medianDifferenceJob(comparison.valuesA, comparison.valuesB, {
            seed,
            paired: comparison.design === 'paired',
          }),
          {
            cancelled: () => id !== runId,
            onProgress: (completed, total) => {
              if (id === runId) bootstrap = { ...bootstrap, completed, total };
            },
          },
        );
        if (id !== runId || !result) return;
        bootstrap = { ...bootstrap, status: 'done', completed: result.resamples, result };
      }

      if (costsA.length > 0 && costsB.length > 0) {
        costInterval = 'running';
        const interval = await runInSlices(costPerAcceptedJob(costsA, costsB, { seed }), {
          cancelled: () => id !== runId,
        });
        if (id !== runId) return;
        costInterval = interval;
      } else {
        costInterval = null;
      }

      finishedKey = `${dataKey}#${seed}`;
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  });

  // Changing the data

  const reveal = (): void => {
    app.revealed = true;
  };

  const changed = (): void => {
    app.touched = true;
    app.linkLeftOutData = false;
  };

  const selectPreset = (id: PresetId): void => {
    app.active = 'preset';
    app.presetId = id;
    app.swapped = false;
    app.endpoint = findPreset(id)?.endpoint ?? 'time';
    app.sigma = null;
    app.delta = null;
    reveal();
    changed();
  };

  const setPaste = (text: string): void => {
    app.pasteText = text;
    app.active = 'paste';
    app.swapped = false;
    reveal();
    changed();
  };

  const setGrid = (grid: GridState): void => {
    app.grid = grid;
    app.active = 'grid';
    app.swapped = false;
    reveal();
    changed();
  };

  const setMode = (mode: InputMode): void => {
    app.mode = mode;
    // Switching tabs shows that input's data, if it has any.
    if (mode === 'paste' && app.pasteText.trim() !== '') app.active = 'paste';
    if (mode === 'type') app.active = 'grid';
    if (mode === 'upload' && app.file) app.active = 'file';
    changed();
  };

  const setMapping = (role: Role, index: number | null): void => {
    const next = { ...mapping };
    // A column fills one role at a time.
    if (index !== null) {
      for (const other of Object.keys(next) as Role[])
        if (next[other] === index) next[other] = null;
    }
    next[role] = index;
    app.mapping = { key: columnsKey, mapping: next };
    changed();
  };

  let fileProgress = $state<string | null>(null);
  let fileStatus = $state<string | null>(null);
  let fileError = $state<string | null>(null);

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (fileProgress) return;
    fileError = null;
    fileStatus = null;

    try {
      const files = await source;
      const first = files[0];
      if (!first) {
        fileError = 'That didn’t include a file.';

        return;
      }

      fileProgress = `Reading ${first.path}…`;
      const result = await readDataFile(first.file, (lines) => {
        fileProgress = `Reading ${first.path}… ${lines.toLocaleString('en-US')} lines`;
      });

      if (!result.ok) {
        fileError = `${first.path}: ${result.error}`;

        return;
      }

      app.file = { name: first.path, parsed: result };
      app.active = 'file';
      app.swapped = false;
      fileStatus = `Read ${first.path}.${files.length > 1 ? ' Only the first file is used.' : ''}`;
      reveal();
      changed();
    } catch {
      fileError = 'That file couldn’t be read. Try choosing it again.';
    } finally {
      fileProgress = null;
    }
  };

  const sourceName = $derived(
    app.active === 'preset'
      ? (findPreset(app.presetId)?.name ?? 'a preset')
      : app.active === 'paste'
        ? 'pasted data'
        : app.active === 'file'
          ? (app.file?.name ?? 'a file')
          : 'typed-in data',
  );

  const outcomes = $derived(buildOutcomes(dataset, mapping, app.paired, costInterval));

  const shareLink = (): string =>
    `${window.location.origin}${window.location.pathname}#${encodeSettings({
      preset: app.active === 'preset' ? app.presetId : null,
      endpoint: app.endpoint,
      paired: app.paired,
      seed: app.seed,
      alpha: app.alpha,
      power: app.power,
      sigma: app.sigma,
      delta: app.delta,
      felt: app.felt,
    })}`;

  const scrollToResults = (): void => {
    const target = document.getElementById('results-heading');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeSettings(window.location.hash);

    if (shared) {
      if (shared.preset) app.presetId = shared.preset;
      app.endpoint = shared.endpoint;
      app.paired = shared.paired;
      app.seed = shared.seed;
      app.alpha = shared.alpha;
      app.power = shared.power;
      app.sigma = shared.sigma;
      app.delta = shared.delta;
      app.felt = shared.felt;
      app.linkLeftOutData = shared.ownData;
      app.revealed = true;
    }

    app.ready = true;
  });

  // Keep the address bar in step with the settings, once the person has changed something.
  $effect(() => {
    if (!app.ready || !app.touched) return;

    const query = encodeSettings({
      preset: app.active === 'preset' ? app.presetId : null,
      endpoint: app.endpoint,
      paired: app.paired,
      seed: app.seed,
      alpha: app.alpha,
      power: app.power,
      sigma: app.sigma,
      delta: app.delta,
      felt: app.felt,
    });
    const timer = setTimeout(() => {
      try {
        // SvelteKit's own replaceState, because writing to window.history directly
        // conflicts with its router.
        replaceState(`#${query}`, {});
      } catch {
        // The address bar is a convenience. The page works without it.
      }
    }, 300);

    return () => clearTimeout(timer);
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Is the difference real?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      You tried a new way of working and it felt faster. Bring the timings from before and after,
      and this page tells you whether the data can actually tell the two apart, how wide the
      uncertainty is, and how many more tasks it would take to know. It also tells you when you’re
      measuring the wrong thing.
    </p>
  </header>

  <PredictCard
    analysis={predictAnalysis}
    prediction={app.prediction}
    ready={app.ready}
    onPredict={(prediction) => {
      app.prediction = prediction;
      reveal();
    }}
    onTryPaired={() => {
      selectPreset('five-paired');
      requestAnimationFrame(scrollToResults);
    }}
  />

  <section aria-labelledby="data-heading" class="space-y-5">
    <div class="max-w-3xl space-y-1">
      <h2 id="data-heading" class={headingClasses}>Your data</h2>
      <p class={bodyClasses}>
        Start from a preset, or bring your own: one row per task, with its condition and how long it
        took. Everything is read in your browser and never sent anywhere.
      </p>
    </div>

    <PresetPicker
      selectedId={app.active === 'preset' ? app.presetId : null}
      ready={app.ready}
      onSelect={selectPreset}
    />

    {#if app.linkLeftOutData}
      <p
        class="max-w-3xl rounded-md bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        role="note"
      >
        This link came from someone’s own data, which links never carry. You’re seeing their
        settings on the default preset.
      </p>
    {/if}

    <LazySection
      name="the data inputs"
      load={() => import('./data-panel.svelte')}
      props={{
        mode: app.mode,
        ready: app.ready,
        pasteText: app.pasteText,
        grid: app.grid,
        progress: fileProgress,
        status: fileStatus,
        error: app.active === 'paste' && !parsed.ok ? parsed.error : fileError,
        onMode: setMode,
        onPaste: setPaste,
        onGrid: setGrid,
        onFiles: loadFiles,
      }}
    />

    <LazySection
      name="the data summary"
      load={() => import('./data-report.svelte')}
      props={{
        columns: table.columns,
        mapping,
        report,
        dataset,
        hasOutcome: outcomePresent,
        editable: app.active === 'paste' || app.active === 'file',
        ready: app.ready,
        onMap: setMapping,
        onSwap: () => {
          app.swapped = !app.swapped;
          changed();
        },
      }}
    />
  </section>

  <section
    id="results"
    aria-labelledby="results-heading"
    tabindex="-1"
    class="scroll-mt-6 space-y-6 outline-none"
  >
    <h2 id="results-heading" class={headingClasses}>Can the data tell them apart?</h2>

    {#if !app.revealed}
      <div class="{panelClasses} max-w-3xl" data-testid="results-hidden">
        <p class={bodyClasses}>
          Make your prediction above first. The analysis appears once you’ve answered, so the answer
          can’t lead you.
        </p>
        <button
          type="button"
          disabled={!app.ready}
          onclick={() => {
            reveal();
            void focusAfterUpdate('results');
          }}
          class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer text-sm font-semibold underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Skip the prediction
        </button>
      </div>
    {:else}
      <AnalysisControls
        endpoints={analysis.endpoints}
        endpoint={analysis.endpoint}
        pairing={meanComparison?.pairing ?? null}
        paired={app.paired}
        ready={app.ready}
        onEndpoint={(endpoint) => {
          app.endpoint = endpoint;
          app.sigma = null;
          app.delta = null;
          changed();
        }}
        onPaired={(paired) => {
          app.paired = paired;
          app.sigma = null;
          app.delta = null;
          changed();
        }}
      />

      <VerdictBanner {verdict} />

      <LazySection
        name="the export buttons"
        load={() => import('./share-actions.svelte')}
        props={{
          ready: app.ready,
          link: shareLink,
          analysis,
          source: sourceName,
          outcomes,
          labels,
          ownData: app.active !== 'preset',
        }}
      />

      {#if meanComparison}
        <section aria-labelledby="dots-heading" class="space-y-3">
          <h3 id="dots-heading" class="text-lg font-bold text-slate-900 dark:text-white">
            Every task
          </h3>
          <LazySection
            name="the dot plot"
            load={() => import('./dot-plot.svelte')}
            props={{ comparison: meanComparison, labels, unit: endpointUnit(analysis.endpoint) }}
          />
        </section>
      {/if}

      <section aria-labelledby="difference-heading" class="space-y-3">
        <h3 id="difference-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          The difference, with its uncertainty
        </h3>
        <LazySection
          name="the difference"
          load={() => import('./difference-panel.svelte')}
          props={{ analysis }}
        />
      </section>

      <section aria-labelledby="outcomes-heading" class="space-y-3">
        <h3 id="outcomes-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          Every outcome
        </h3>
        <p class="max-w-3xl {bodyClasses}">
          The endpoint you picked decides the verdict. The rest are here so you can see what you’d
          be trading. Greyed-out rows aren’t in your data.
        </p>
        <LazySection
          name="the outcome table"
          load={() => import('./outcome-table.svelte')}
          props={{ rows: outcomes, labels }}
        />
      </section>

      <section aria-labelledby="bootstrap-heading" class="space-y-3">
        <h3 id="bootstrap-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          Bootstrap check
        </h3>
        <LazySection
          name="the bootstrap"
          load={() => import('./bootstrap-panel.svelte')}
          props={{
            view: bootstrap,
            seed: app.seed,
            unit: endpointUnit(analysis.endpoint),
            ready: app.ready,
            onSeed: (seed: number) => {
              app.seed = seed;
              changed();
            },
          }}
        />
      </section>
    {/if}
  </section>

  <section aria-labelledby="planner-heading" class="space-y-3">
    <h2 id="planner-heading" class={headingClasses}>How many tasks would it take?</h2>
    <LazySection
      name="the planner"
      load={() => import('./planner-panel.svelte')}
      props={{
        sigma: planner.sigma,
        delta: planner.delta,
        alpha: app.alpha,
        power: app.power,
        paired: planner.paired,
        following: app.sigma === null && app.delta === null && meanComparison !== null,
        canFollow: meanComparison !== null,
        unit: meanComparison ? endpointUnit(analysis.endpoint) : 'minutes',
        ready: app.ready,
        onChange: (patch: { sigma?: number; delta?: number; alpha?: number; power?: number }) => {
          if (patch.sigma !== undefined) {
            app.sigma = patch.sigma;
            app.delta ??= planner.delta;
          }
          if (patch.delta !== undefined) {
            app.delta = patch.delta;
            app.sigma ??= planner.sigma;
          }
          if (patch.alpha !== undefined) app.alpha = patch.alpha;
          if (patch.power !== undefined) app.power = patch.power;
          changed();
        },
        onFollow: () => {
          app.sigma = null;
          app.delta = null;
          changed();
        },
      }}
    />
  </section>

  <section aria-labelledby="perception-heading" class="space-y-3">
    <h2 id="perception-heading" class={headingClasses}>Feeling faster isn’t a measurement</h2>
    <LazySection
      name="the perception chart"
      load={() => import('./perception-gap.svelte')}
      props={{
        measured: app.revealed ? measuredSpeedup : null,
        felt: app.felt,
        ready: app.ready,
        onFelt: (felt: number | null) => {
          app.felt = felt;
          changed();
        },
      }}
    />
  </section>

  <FooterNotes />
</div>
