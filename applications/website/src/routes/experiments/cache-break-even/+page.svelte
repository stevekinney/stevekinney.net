<script lang="ts">
  import { Copy, Link } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  import { replaceState } from '$app/navigation';
  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import CachePreservingCallout from './cache-preserving-callout.svelte';
  import {
    defaultState,
    evaluateState,
    MAX_TOKENS,
    normalizeState,
    swapState,
  } from './calculator-state';
  import type { CalculatorState } from './calculator-state';
  import { parseContextReadout } from './context-readout';
  import { experiment } from './experiment';
  import { badgeClasses, headingClasses, hintClasses, panelClasses } from './field-styles';
  import { matchModel } from './match-model';
  import { buildOptions } from './options';
  import type { OptionRow } from './options';
  import { defaultPricing, isCustomPricing } from './pricing';
  import type { PricingTable } from './pricing';
  import { readSession } from './session-import';
  import type { SessionImport } from './session-import';
  import SessionSection from './session-section.svelte';
  import SetupCard from './setup-card.svelte';
  import type { FieldSources } from './setup-card.svelte';
  import { decodeConfiguration, encodeConfiguration } from './share-link';
  import StatTiles from './stat-tiles.svelte';
  import { buildSummary } from './summary';
  import VerdictBanner from './verdict-banner.svelte';
  import ExplanationFooter from './explanation-footer.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/cache-break-even` },
  ]);

  type Source = 'session' | 'readout' | null;

  // One state object: the setup and the price table. Every figure on the page is derived from them.
  const app = $state({
    calc: { ...defaultState } as CalculatorState,
    ready: false,
    touched: false,
  });
  let pricing = $state.raw<PricingTable>(defaultPricing);

  // Where the filled-in fields came from, until the person edits them.
  const sources = $state<{
    fromModel: Source;
    contextTokens: Source;
    remainingOutput: Source;
  }>({ fromModel: null, contextTokens: null, remainingOutput: null });

  const evaluation = $derived(evaluateState(app.calc, pricing));
  const options = $derived(buildOptions(app.calc, pricing));
  const customPrices = $derived(isCustomPricing(pricing));

  const sourceLabels: Record<'session' | 'readout', string> = {
    session: 'from your session',
    readout: 'from your pasted readout',
  };
  const fieldSources = $derived<FieldSources>({
    fromModel: sources.fromModel ? sourceLabels[sources.fromModel] : null,
    contextTokens: sources.contextTokens ? sourceLabels[sources.contextTokens] : null,
    remainingOutput: sources.remainingOutput ? sourceLabels[sources.remainingOutput] : null,
  });

  const update = (patch: Partial<CalculatorState>, edited?: keyof FieldSources): void => {
    app.calc = { ...app.calc, ...patch };
    if (edited) sources[edited] = null;
    app.touched = true;
  };

  const changeEffort = (side: 'from' | 'to', effort: string): void => {
    update(
      side === 'from'
        ? { fromEffort: effort, ratioOverride: null }
        : { toEffort: effort, ratioOverride: null },
    );
  };

  const swap = (): void => {
    app.calc = swapState(app.calc);
    sources.fromModel = null;
    app.touched = true;
  };

  const selectOption = (row: OptionRow): void =>
    update({ toModel: row.model.id, toEffort: row.effort.id, ratioOverride: null });

  const selectCell = (contextTokens: number, remainingOutput: number): void => {
    update({ contextTokens, remainingOutput }, 'contextTokens');
    sources.remainingOutput = null;
  };

  const setPricing = (table: PricingTable): void => {
    pricing = table;
    app.calc = normalizeState(app.calc, table);
    app.touched = true;
  };

  // Importing a session

  let session = $state.raw<SessionImport | null>(null);
  let progress = $state<{ current: number; total: number } | null>(null);
  // Set from the drop, before a dropped folder has been walked, so a second drop can't start.
  let loading = $state(false);
  let readError = $state<string | null>(null);
  let readMessage = $state<string | null>(null);
  let estimate = $state({ average: '', turns: '' });
  let beforeImport: Pick<
    CalculatorState,
    'fromModel' | 'contextTokens' | 'remainingOutput'
  > | null = null;

  const matchedModel = $derived(session ? matchModel(session.modelId, pricing) : null);

  /** Puts back every field the current import filled in and the person hasn't edited since. */
  const restoreImportedFields = (): void => {
    if (beforeImport) {
      const patch: Partial<CalculatorState> = {};
      if (sources.fromModel === 'session') patch.fromModel = beforeImport.fromModel;
      if (sources.contextTokens === 'session') patch.contextTokens = beforeImport.contextTokens;
      if (sources.remainingOutput === 'session')
        patch.remainingOutput = beforeImport.remainingOutput;
      app.calc = normalizeState({ ...app.calc, ...patch }, pricing);
    }

    for (const field of ['fromModel', 'contextTokens', 'remainingOutput'] as const) {
      if (sources[field] === 'session') sources[field] = null;
    }
  };

  const applySession = (imported: SessionImport): void => {
    // A second import replaces the first, so nothing the first filled in carries over.
    restoreImportedFields();

    beforeImport ??= {
      fromModel: app.calc.fromModel,
      contextTokens: app.calc.contextTokens,
      remainingOutput: app.calc.remainingOutput,
    };

    const model = matchModel(imported.modelId, pricing);
    session = imported;
    estimate = { average: formatTokenCount(imported.meanOutput), turns: '' };
    update(
      model
        ? { contextTokens: imported.contextTokens, fromModel: model.id }
        : { contextTokens: imported.contextTokens },
    );
    sources.contextTokens = 'session';
    sources.fromModel = model ? 'session' : null;
  };

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    readError = null;
    readMessage = null;

    try {
      const files = await source;
      if (files.length === 0) {
        readError =
          'That didn’t include any session files. Claude Code saves sessions as .jsonl files.';

        return;
      }

      progress = { current: 1, total: files.length };
      const imported = await readSession(files, (index) => {
        progress = { current: index + 1, total: files.length };
      });

      if (!imported) {
        readError =
          'None of those files had a main-thread Claude Code response in them, so nothing changed.';

        return;
      }

      applySession(imported);
      readMessage = `Read ${files.length === 1 ? '1 file' : `${files.length} files`}. Your session’s summary is below.`;
    } catch {
      readError = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      progress = null;
      loading = false;
    }
  };

  const discardImport = (): void => {
    restoreImportedFields();

    beforeImport = null;
    session = null;
    readMessage = null;
    readError = null;
    estimate = { average: '', turns: '' };
  };

  const editEstimate = (field: 'average' | 'turns', text: string): void => {
    estimate = { ...estimate, [field]: text };

    const average = parseTokenCount(estimate.average);
    const turns = parseTokenCount(estimate.turns);
    const total = average !== null && turns !== null ? average * turns : null;

    // The product of two fields that are each in range can still be out of range.
    if (
      total !== null &&
      turns !== null &&
      turns > 0 &&
      Number.isSafeInteger(total) &&
      total <= MAX_TOKENS
    ) {
      update({ remainingOutput: total }, 'remainingOutput');
      sources.remainingOutput = 'session';
    }
  };

  // Pasting a context readout

  let pasteText = $state('');
  const readout = $derived(parseContextReadout(pasteText));

  const useReadout = (): void => {
    if (!readout) return;

    update({ contextTokens: readout.used }, 'contextTokens');
    sources.contextTokens = 'readout';
  };

  // Sharing

  let notice = $state<string | null>(null);
  let fallback = $state<{ label: string; text: string } | null>(null);
  let fallbackField = $state<HTMLTextAreaElement>();

  $effect(() => {
    if (fallback && fallbackField) {
      fallbackField.focus();
      fallbackField.select();
    }
  });

  const copyText = async (label: string, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      fallback = null;
      notice = `${label} copied.`;
    } catch {
      fallback = { label, text };
      notice = `Couldn’t reach the clipboard. The ${label.toLowerCase()} is selected below: press Command-C or Control-C to copy it.`;
    }
  };

  const shareLink = (): string =>
    `${window.location.origin}${window.location.pathname}#${encodeConfiguration(app.calc, pricing)}`;

  // Lazy sections: the heavy views load after the page is interactive.

  let WhereYouStandChart = $state.raw<Component<{
    evaluation: typeof evaluation;
    onSelectContext: (contextTokens: number) => void;
  }> | null>(null);
  let OptionsTable = $state.raw<Component<{
    rows: OptionRow[];
    selectedKey: string;
    onSelect: (row: OptionRow) => void;
  }> | null>(null);

  let SensitivityMap = $state.raw<Component<{
    evaluation: typeof evaluation;
    onSelect: (contextTokens: number, remainingOutput: number) => void;
  }> | null>(null);
  let ScenariosPanel = $state.raw<Component<{
    setup: CalculatorState;
    pricing: PricingTable;
    onLoad: (state: CalculatorState) => void;
  }> | null>(null);
  let PricesPanel = $state.raw<Component<{
    pricing: PricingTable;
    onChange: (table: PricingTable) => void;
  }> | null>(null);
  let pricesOpen = $state(false);
  let pricesFailed = $state(false);
  let pricesSection = $state<HTMLElement>();

  const openPrices = (): void => {
    pricesOpen = true;
    pricesSection?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  $effect(() => {
    if (!pricesOpen || PricesPanel) return;

    import('./prices-panel.svelte')
      .then((module) => {
        PricesPanel = module.default;
      })
      .catch(() => {
        pricesFailed = true;
      });
  });

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const decoded = decodeConfiguration(window.location.hash);
    if (decoded) {
      pricing = decoded.pricing;
      app.calc = decoded.state;
    }

    app.ready = true;

    import('./where-you-stand-chart.svelte').then((module) => {
      WhereYouStandChart = module.default;
    });
    import('./options-table.svelte').then((module) => {
      OptionsTable = module.default;
    });
    import('./sensitivity-map.svelte').then((module) => {
      SensitivityMap = module.default;
    });
    import('./scenarios-panel.svelte').then((module) => {
      ScenariosPanel = module.default;
    });
  });

  // Keep the address bar in step with the setup, once the person has changed something.
  $effect(() => {
    if (!app.ready || !app.touched) return;

    const query = encodeConfiguration(app.calc, pricing);
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

<div class="space-y-10">
  <header class="max-w-3xl space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Breaking the cache: model and effort calculator
      </h1>
      {#if customPrices}
        <span class={badgeClasses} data-custom-prices>custom prices</span>
      {/if}
    </div>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Switching models, or changing the effort level, in the middle of a session makes the provider
      reprocess everything already in your context. That reprocess is billed as a cache write on the
      destination. Set where you’re coming from, where you’re going, how much context you’ve built,
      and how much output work is left, and the chart updates live.
    </p>
  </header>

  <SessionSection
    {session}
    {matchedModel}
    {progress}
    busy={loading}
    message={readMessage}
    error={readError}
    {pasteText}
    {readout}
    {estimate}
    ready={app.ready}
    onFiles={loadFiles}
    onPasteInput={(text) => (pasteText = text)}
    onUseReadout={useReadout}
    onEstimateInput={editEstimate}
    onDiscard={discardImport}
    onOpenPrices={openPrices}
  />

  <div class="space-y-6">
    <SetupCard
      setup={app.calc}
      {pricing}
      {evaluation}
      sources={fieldSources}
      ready={app.ready}
      onChange={update}
      onEffortChange={changeEffort}
      onSwap={swap}
    />

    <StatTiles {evaluation} />
    <VerdictBanner {evaluation} />
    <CachePreservingCallout {evaluation} />

    <div class="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        icon={Link}
        disabled={!app.ready}
        onclick={() => copyText('Link', shareLink())}
      >
        Copy link
      </Button>
      <Button
        variant="secondary"
        icon={Copy}
        disabled={!app.ready}
        onclick={() => copyText('Summary', buildSummary(evaluation, customPrices))}
      >
        Copy summary
      </Button>
      <p class={hintClasses} role="status">{notice ?? ''}</p>
    </div>
    {#if fallback}
      <textarea
        bind:this={fallbackField}
        readonly
        rows="6"
        aria-label="{fallback.label} to copy"
        value={fallback.text}
        class="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      ></textarea>
    {/if}
  </div>

  {#if WhereYouStandChart}
    <WhereYouStandChart
      {evaluation}
      onSelectContext={(contextTokens) => update({ contextTokens }, 'contextTokens')}
    />
  {:else}
    <section aria-labelledby="chart-heading" class={panelClasses}>
      <h2 id="chart-heading" class={headingClasses}>Where you stand</h2>
      <p class={hintClasses}>Loading the chart…</p>
    </section>
  {/if}

  {#if OptionsTable}
    <OptionsTable
      rows={options}
      selectedKey="{evaluation.to.id}:{evaluation.toEffort.id}"
      onSelect={selectOption}
    />
  {:else}
    <section aria-labelledby="options-heading" class="space-y-3">
      <h2 id="options-heading" class={headingClasses}>Every option from here</h2>
      <p class={hintClasses}>Loading the table…</p>
    </section>
  {/if}

  <section aria-labelledby="sensitivity-heading" class={panelClasses}>
    <div class="space-y-1">
      <h2 id="sensitivity-heading" class={headingClasses}>Sensitivity map</h2>
      <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
        Net for every combination of context (N) and remaining work (R), with the line where the
        change breaks even. Choose a cell to set both.
      </p>
    </div>
    {#if SensitivityMap}
      <SensitivityMap {evaluation} onSelect={selectCell} />
    {:else}
      <p class={hintClasses}>Loading the map…</p>
    {/if}
  </section>

  <section bind:this={pricesSection} aria-label="Prices and assumptions" class="scroll-mt-6">
    <details
      bind:open={pricesOpen}
      class="rounded-lg border border-slate-200 dark:border-slate-700"
    >
      <summary class="cursor-pointer p-4 text-xl font-bold text-slate-900 sm:px-6 dark:text-white">
        Prices and assumptions
        {#if customPrices}
          <span class="{badgeClasses} ml-2 align-middle">custom prices</span>
        {/if}
      </summary>
      <div class="space-y-4 border-t border-slate-200 p-4 sm:p-6 dark:border-slate-700">
        {#if PricesPanel}
          <PricesPanel {pricing} onChange={setPricing} />
        {:else if pricesFailed}
          <p role="alert" class="text-sm text-red-700 dark:text-red-400">
            The price editor couldn’t load. Reload the page to try again.
          </p>
        {:else}
          <p class={hintClasses}>Loading the price editor…</p>
        {/if}
      </div>
    </details>
  </section>

  {#if ScenariosPanel}
    <ScenariosPanel
      setup={app.calc}
      {pricing}
      onLoad={(saved) => {
        app.calc = normalizeState(saved, pricing);
        sources.fromModel = null;
        sources.contextTokens = null;
        sources.remainingOutput = null;
        app.touched = true;
      }}
    />
  {/if}

  <ExplanationFooter {evaluation} {pricing} />
</div>
