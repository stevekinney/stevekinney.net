<script lang="ts">
  import { Copy, Download, Link, Pin, PinOff, Repeat } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';
  import type { Component } from 'svelte';

  import { replaceState } from '$app/navigation';
  import Button from '$lib/components/button';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import AutocompactControl from './autocompact-control.svelte';
  import { terms } from './budget';
  import {
    chooseCapacity,
    clearPin,
    discardReadout,
    fillFromReadout,
    initialState,
    loadScenario,
    pinCurrent,
    selectPreset,
    setCapacity,
    setTerm,
    setThresholdPercent,
    setThresholdTokens,
    swapWithPinned,
  } from './budget-state';
  import type { BudgetState } from './budget-state';
  import { usable } from './budget';
  import type { TermKey } from './budget';
  import CapacityControl from './capacity-control.svelte';
  import { copyText } from './copy-text';
  import { initialEvidence } from './evidence-state';
  import type { EvidenceState } from './evidence-state';
  import type { EvidenceSummary, FitPlan } from './fit-check';
  import { experiment } from './experiment';
  import { fieldClasses } from './field-styles';
  import { planFit, summarizeEvidence } from './fit-check';
  import FooterNotes from './footer-notes.svelte';
  import Hero from './hero.svelte';
  import PresetPicker from './preset-picker.svelte';
  import { setReady } from './ready-context';
  import ReadoutGuide from './readout-guide.svelte';
  import { applyReadout, defaultMapping, parseReadout } from './readout-parser';
  import type { AppliedReadout, Destination, LabelMapping, ParsedReadout } from './readout-parser';
  import { loadSavedMapping, saveMapping } from './saved-mapping';
  import { decodeState, encodeState } from './share-link';
  import TermControl from './term-control.svelte';
  import TermsTable from './terms-table.svelte';
  import { layoutWaterfall } from './waterfall';
  import type { ColumnKey } from './waterfall';
  import WaterfallChart from './waterfall-chart.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/usable-evidence-budget` },
  ]);

  // The calculation lives in plain modules. These are the only state: the
  // scenario and everything about it, the files, and what was pasted. Every
  // change replaces a value, and everything on the page derives from them.
  let budget = $state.raw<BudgetState>(initialState());
  let evidence = $state.raw<EvidenceState>(initialEvidence());
  let readoutText = $state('');
  let overrides = $state.raw<LabelMapping>({});
  let ready = $state(false);
  let touched = $state(false);
  let chartSvg: SVGSVGElement | undefined = $state();
  let shareMessage = $state<string | null>(null);
  let manualCopyText = $state<string | null>(null);
  let manualCopyBox: HTMLTextAreaElement | undefined = $state();

  // The file list and the readout panel are the heaviest parts of the page,
  // and neither is needed until someone uses them, so they load after the page is interactive.
  let EvidenceFit = $state.raw<Component<{
    evidence: EvidenceState;
    plan: FitPlan;
    summary: EvidenceSummary | null;
    scenario: BudgetState['scenario'];
    usable: number;
    onChange: (next: EvidenceState) => void;
  }> | null>(null);
  let ReadoutPanel = $state.raw<Component<{
    text: string;
    parsed: ParsedReadout;
    applied: AppliedReadout | null;
    currentCapacity: number;
    mapping: LabelMapping;
    overrides: LabelMapping;
    filled: boolean;
    onText: (text: string) => void;
    onAssign: (label: string, destination: Destination) => void;
    onResetMapping: () => void;
    onDiscard: () => void;
  }> | null>(null);
  let sectionsFailed = $state(false);

  setReady(() => ready);

  const scenario = $derived(budget.scenario);
  const left = $derived(usable(scenario));
  const plan = $derived(planFit(evidence.files, evidence.charactersPerToken, left, evidence.mode));
  const evidenceSummary = $derived(
    evidence.files.length > 0 ? summarizeEvidence(plan.evidence, left) : null,
  );
  const chart = $derived(
    layoutWaterfall(scenario, budget.pinned, evidenceSummary ? plan.evidence : null),
  );

  const mapping = $derived<LabelMapping>({ ...defaultMapping, ...overrides });
  const parsedReadout = $derived(parseReadout(readoutText));
  const appliedReadout = $derived(
    parsedReadout.form === 'none' ? null : applyReadout(parsedReadout, mapping, scenario.capacity),
  );

  const change = (next: BudgetState): void => {
    budget = next;
    touched = true;
  };

  const markFromReadout = (key: TermKey | 'capacity'): boolean => budget.fromReadout.includes(key);

  const fillFrom = (text: string, labels: LabelMapping, refill: boolean): void => {
    const parsed = parseReadout(text);
    if (parsed.form === 'none') return;

    change(
      fillFromReadout(
        budget,
        applyReadout(parsed, { ...defaultMapping, ...labels }, budget.scenario.capacity),
        { refill },
      ),
    );
  };

  const changeReadoutText = (text: string): void => {
    readoutText = text;
    fillFrom(text, overrides, false);
  };

  const assignLabel = (label: string, destination: Destination): void => {
    overrides = { ...overrides, [label]: destination };
    saveMapping(overrides);
    fillFrom(readoutText, overrides, true);
  };

  const resetMapping = (): void => {
    overrides = {};
    saveMapping(overrides);
    fillFrom(readoutText, overrides, true);
  };

  const discard = (): void => {
    change(discardReadout(budget));
    readoutText = '';
  };

  const prefersReducedMotion = (): boolean =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clicking a bar takes you to the control behind it.
  const activateColumn = (key: ColumnKey): void => {
    const target = document.getElementById(
      key === 'capacity'
        ? 'capacity-select'
        : key === 'usable'
          ? 'evidence-heading'
          : `slider-${key}`,
    );
    if (!target) return;

    target.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
    target.focus({ preventScroll: true });
  };

  const sharedLink = (): string =>
    `${window.location.origin}${window.location.pathname}#${encodeState({
      scenario: budget.scenario,
      presetId: budget.presetId,
      pinned: budget.pinned,
    })}`;

  // The clipboard can reject. When it does, the text goes in a box, already
  // selected, with a note to copy it by hand.
  const copy = async (text: string, copied: string): Promise<void> => {
    if (await copyText(text)) {
      manualCopyText = null;
      shareMessage = copied;

      return;
    }

    manualCopyText = text;
    shareMessage = 'Couldn’t reach the clipboard. Press Command-C or Control-C to copy it.';
    await tick();
    manualCopyBox?.select();
  };

  const copyLink = (): Promise<void> =>
    copy(
      sharedLink(),
      'Link copied. It holds the capacity, the five terms, and A, and nothing you pasted or dropped.',
    );

  // Only a click needs the summary and the image export, so they load then.
  const copySummary = async (): Promise<void> => {
    const { buildSummary } = await import('./summary');

    await copy(
      buildSummary(
        budget.scenario,
        evidence.files.length > 0
          ? {
              tokens: plan.evidence,
              fileCount: plan.includedCount,
              charactersPerToken: evidence.charactersPerToken,
            }
          : null,
      ),
      'Summary copied as Markdown.',
    );
  };

  const downloadChart = async (): Promise<void> => {
    if (!chartSvg) return;

    try {
      const { downloadChartImage } = await import('./export-image');

      await downloadChartImage(chartSvg, 'usable-evidence-budget.png');
      manualCopyText = null;
      shareMessage = 'Chart saved as an image.';
    } catch {
      shareMessage = 'The chart couldn’t be saved as an image. Try again.';
    }
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeState(window.location.hash.slice(1));
    if (shared) {
      budget = {
        ...loadScenario(budget, shared.scenario, shared.presetId),
        pinned: shared.pinned,
      };
    }

    overrides = loadSavedMapping();
    ready = true;

    // Fetch these now, so a click on Copy summary or Download finds them already loaded.
    void import('./summary');
    void import('./export-image');

    import('./evidence-fit.svelte')
      .then((module) => {
        EvidenceFit = module.default;
      })
      .catch(() => {
        sectionsFailed = true;
      });
    import('./readout-panel.svelte')
      .then((module) => {
        ReadoutPanel = module.default;
      })
      .catch(() => {
        sectionsFailed = true;
      });
  });

  // Keep the address bar in step with the controls, once the person has changed one.
  $effect(() => {
    if (!ready || !touched) return;

    const query = encodeState({
      scenario: budget.scenario,
      presetId: budget.presetId,
      pinned: budget.pinned,
    });

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
  <header class="max-w-3xl space-y-4">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      What’s actually left for evidence
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      A context window is a capacity limit. It is not a promise that every token gets used equally
      well. Before any of it holds the thing you’re working on, five other claims are already
      against it. This tool is that subtraction, made visible.
    </p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <pre
      tabindex="0"
      role="region"
      class="focus-visible:outline-primary-600 overflow-x-auto rounded-lg bg-slate-100 p-4 font-mono text-sm leading-relaxed text-slate-800 focus-visible:outline-2 dark:bg-slate-800 dark:text-slate-100"
      aria-label="usable evidence budget equals context capacity minus trusted instructions, minus task and retained history, minus exposed tool definitions, minus reserved generation, minus operational margin"><code
        ><strong>usable evidence budget</strong> = <strong>context capacity</strong>
                       − <strong>trusted instructions</strong>
                       − <strong>task and retained history</strong>
                       − <strong>exposed tool definitions</strong>
                       − <strong>reserved generation</strong>
                       − <strong>operational margin</strong></code
      ></pre>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      This page has no server. What you paste or drop is read in your browser and never sent
      anywhere.
    </p>
  </header>

  <Hero
    {scenario}
    pinned={budget.pinned}
    evidence={evidenceSummary}
    charactersPerToken={evidence.charactersPerToken}
  />

  <section aria-labelledby="start-heading" class="space-y-4">
    <h2 id="start-heading" class="text-xl font-bold text-slate-900 dark:text-white">Start here</h2>
    <PresetPicker
      selectedId={budget.presetId}
      onSelect={(id) => change(selectPreset(budget, id))}
    />
  </section>

  <section aria-labelledby="chart-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="chart-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Where the window goes
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Each draw floats down from what is left after the one before it. Hover or focus a bar to
        read it, and select a draw to jump to its control.
      </p>
    </div>

    <WaterfallChart
      {chart}
      {scenario}
      pinned={budget.pinned}
      hasEvidence={evidenceSummary !== null}
      onActivate={activateColumn}
      bind:svg={chartSvg}
    />

    <div class="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        icon={Pin}
        disabled={!ready}
        onclick={() => change(pinCurrent(budget))}
      >
        Pin as A
      </Button>
      <Button
        variant="secondary"
        icon={Repeat}
        disabled={!ready || !budget.pinned}
        onclick={() => change(swapWithPinned(budget))}
      >
        Swap
      </Button>
      <Button
        variant="secondary"
        icon={PinOff}
        disabled={!ready || !budget.pinned}
        onclick={() => change(clearPin(budget))}
      >
        Clear pin
      </Button>
      <span class="mx-1 hidden h-6 w-px bg-slate-300 sm:block dark:bg-slate-600" aria-hidden="true"
      ></span>
      <Button variant="secondary" icon={Link} disabled={!ready} onclick={copyLink}>Copy link</Button
      >
      <Button variant="secondary" icon={Copy} disabled={!ready} onclick={copySummary}>
        Copy summary
      </Button>
      <Button variant="secondary" icon={Download} disabled={!ready} onclick={downloadChart}>
        Download chart image
      </Button>
    </div>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Pin the scenario you have as A, change something, and the chart ghosts A behind the new bars
      while the table shows the difference.
    </p>
    <p
      role="status"
      class="min-h-5 text-sm text-slate-700 dark:text-slate-200"
      data-testid="share-message"
    >
      {shareMessage ?? ''}
    </p>
    {#if manualCopyText !== null}
      <textarea
        bind:this={manualCopyBox}
        readonly
        rows="4"
        aria-label="Text to copy"
        value={manualCopyText}
        class="{fieldClasses} font-mono text-sm"></textarea>
    {/if}

    <TermsTable {scenario} pinned={budget.pinned} />
  </section>

  <section aria-labelledby="terms-heading" class="space-y-4">
    <h2 id="terms-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      Adjust the terms
    </h2>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Sliders step by 1K, and the boxes accept shorthand such as 25k, 1.2m, or 25,000.
    </p>
    <div class="grid gap-x-8 gap-y-8 md:grid-cols-2">
      <CapacityControl
        capacity={scenario.capacity}
        custom={budget.customCapacity}
        fromReadout={markFromReadout('capacity')}
        onChoose={(choice) => change(chooseCapacity(budget, choice))}
        onCustomChange={(capacity) => change(setCapacity(budget, capacity))}
      />
      {#each terms as term (term.key)}
        <TermControl
          {term}
          value={scenario[term.key]}
          fromReadout={markFromReadout(term.key)}
          onChange={(value) => change(setTerm(budget, term.key, value))}
        >
          {#if term.key === 'margin'}
            <AutocompactControl
              capacity={scenario.capacity}
              margin={scenario.margin}
              onThresholdTokens={(tokens) => change(setThresholdTokens(budget, tokens))}
              onThresholdPercent={(percent) => change(setThresholdPercent(budget, percent))}
            />
          {/if}
        </TermControl>
      {/each}
    </div>
  </section>

  <section
    aria-labelledby="evidence-heading"
    class="space-y-4 rounded-lg border border-slate-200 p-4 sm:p-6 dark:border-slate-700"
  >
    <div class="max-w-3xl space-y-1">
      <h2
        id="evidence-heading"
        tabindex="-1"
        class="text-xl font-bold text-slate-900 outline-none dark:text-white"
      >
        Will my evidence fit?
      </h2>
      <p class="text-slate-600 dark:text-slate-300">
        Drop the material you want the model to work with and see how much of the usable budget it
        takes. Token counts are estimates from each file’s length.
      </p>
    </div>
    {#if EvidenceFit}
      <EvidenceFit
        {evidence}
        {plan}
        summary={evidenceSummary}
        {scenario}
        usable={left}
        onChange={(next) => {
          evidence = next;
        }}
      />
    {:else if sectionsFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The file check didn’t load. Reload the page to try again.
      </p>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading the file check…</p>
    {/if}
  </section>

  <section aria-labelledby="numbers-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="numbers-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        Getting your own numbers
      </h2>
      <p class="text-slate-600 dark:text-slate-300">
        Run <code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-slate-800"
          >/context</code
        > in Claude Code to see where your window is going. This table maps each term to what that readout
        calls it.
      </p>
    </div>
    <ReadoutGuide />
    {#if ReadoutPanel}
      <ReadoutPanel
        text={readoutText}
        parsed={parsedReadout}
        applied={appliedReadout}
        currentCapacity={scenario.capacity}
        {mapping}
        {overrides}
        filled={budget.fromReadout.length > 0}
        onText={changeReadoutText}
        onAssign={assignLabel}
        onResetMapping={resetMapping}
        onDiscard={discard}
      />
    {:else if sectionsFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The readout box didn’t load. Reload the page to try again.
      </p>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading the readout box…</p>
    {/if}
  </section>

  <FooterNotes />
</div>
