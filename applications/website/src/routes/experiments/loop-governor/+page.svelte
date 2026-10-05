<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import LazySection from '../compact-or-clear/lazy-section.svelte';
  import { falseDoneBeforeTrue } from './analytic';
  import CautionaryTales from './cautionary-tales.svelte';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import FourJobs from './four-jobs.svelte';
  import LoopControls from './loop-controls.svelte';
  import LoopFooter from './loop-footer.svelte';
  import { cloneConfig, defaultConfig, defaultLadder } from './loop-config';
  import type { Config, Governors, MarkerId } from './loop-config';
  import MarkerLadder from './marker-ladder.svelte';
  import PredictFirst from './predict-first.svelte';
  import { findPreset, presetMatching } from './presets';
  import { decodeState, encodeState } from './share-link';
  import { createBatch, simulateBatch } from './simulate';
  import type { Tally } from './simulate';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/loop-governor` },
  ]);

  /** How long a slice of simulation runs before the page gets a turn to paint and respond. */
  const SLICE_MILLISECONDS = 30;

  // The configuration drives everything, and the tally is what it produced. Both are
  // replaced whole on every change and kept raw, because the simulation reads them
  // millions of times and a reactive proxy would slow every read.
  let config = $state.raw<Config>(defaultConfig());
  let tally = $state.raw<Tally>(simulateBatch(defaultConfig()));
  /** The tally's configuration, which lags the controls while a batch runs. */
  let tallied = $state.raw<Config>(defaultConfig());
  let pinned = $state.raw<{ config: Config; tally: Tally } | null>(null);

  const page = $state({
    simulating: false,
    simulated: 0,
    guess: 50,
    answer: null as { exact: number; simulated: number; runs: number } | null,
    showResults: false,
    ready: false,
    touched: false,
  });

  let ReplayPanel = $state.raw<Component<{
    settings: { stallM: number; maxIterations: number; budget: number };
  }> | null>(null);
  let replayFailed = $state(false);

  const presetId = $derived(presetMatching(config)?.id ?? null);
  const change = (next: Config): void => {
    config = next;
    page.touched = true;
  };

  const patch = (values: Partial<Config>): void => change({ ...cloneConfig(config), ...values });

  const setGovernor = (id: keyof Governors, on: boolean): void => {
    const next = cloneConfig(config);
    next.governors[id] = on;
    change(next);
  };

  const choosePreset = (id: string): void => {
    const preset = findPreset(id);
    if (preset) change(preset.apply(config));
  };

  const selectMarker = (marker: MarkerId): void => patch({ marker });

  const editLadder = (marker: MarkerId, q: number): void => {
    const next = cloneConfig(config);
    next.ladder[marker] = q;
    change(next);
  };

  const resetLadder = (): void => patch({ ladder: defaultLadder() });

  // Runs the batch in slices, so 10,000 long runs never freeze the page. A newer
  // configuration abandons an older batch.
  let generation = 0;
  $effect(() => {
    const current = config;
    const token = ++generation;

    if (!page.ready) return;

    const batch = createBatch(current);
    const work = (): void => {
      if (token !== generation) return;

      const done = batch.step(SLICE_MILLISECONDS);
      page.simulated = batch.tally.runs;

      if (done) {
        tally = batch.tally;
        tallied = current;
        page.simulating = false;
      } else {
        page.simulating = true;
        setTimeout(work, 0);
      }
    };

    // A short pause lets a slider settle before a large batch starts.
    const timer = setTimeout(work, current.runs > 2_000 ? 120 : 0);

    return () => clearTimeout(timer);
  });

  const reveal = (): void => {
    const question = defaultConfig();
    const tally = simulateBatch(question);

    page.answer = {
      exact: falseDoneBeforeTrue(question.p, question.ladder[question.marker]),
      simulated: tally.outcomes['done-false'] / tally.runs,
      runs: tally.runs,
    };
    page.showResults = true;
  };

  const togglePin = (): void => {
    pinned = pinned ? null : { config: cloneConfig(tallied), tally };
    page.touched = true;
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = decodeState(window.location.hash.slice(1));
    if (shared) {
      config = shared.config;
      if (shared.pinned) {
        pinned = { config: shared.pinned, tally: simulateBatch(shared.pinned) };
      }
      // Someone sent this configuration on purpose, so its results show straight away.
      page.showResults = true;
    }

    page.ready = true;
    // Fetch the results now, so revealing them finds them already loaded.
    void import('./results.svelte');

    import('./replay-panel.svelte')
      .then((module) => {
        ReplayPanel = module.default;
      })
      .catch(() => {
        replayFailed = true;
      });
  });

  // Keep the address bar in step with the controls, once a person has changed one.
  $effect(() => {
    if (!page.ready || !page.touched) return;

    const query = encodeState({ config, pinned: pinned?.config ?? null });

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
      Will your agent loop stop honestly?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Leave an agent looping on a task and one of three things happens: it finishes, it stops on a
      false “done”, or it runs away with your budget. Which one you get isn’t up to the agent. It’s
      decided by whether the oracle can be satisfied without the work, whether the measurement fails
      open, and whether anything enforces a stop. None of those improve with a smarter model.
    </p>
    <p class="text-sm text-slate-500 dark:text-slate-400">
      This page simulates thousands of loops in your browser. Nothing you configure or replay is
      sent anywhere.
    </p>
  </header>

  <PredictFirst
    ready={page.ready}
    guess={page.guess}
    answer={page.answer}
    onGuess={(guess) => (page.guess = guess)}
    onReveal={reveal}
  />

  <FourJobs {config} />

  <section aria-labelledby="configure-heading" class={panelClasses}>
    <h2 id="configure-heading" class={headingClasses}>Configure the loop</h2>
    <LoopControls
      ready={page.ready}
      {config}
      {presetId}
      models={data.models}
      pricesUpdated={data.pricesUpdated}
      onChange={patch}
      onGovernor={setGovernor}
      onPreset={choosePreset}
    />
  </section>

  {#if page.showResults}
    <LazySection
      name="the results"
      load={() => import('./results.svelte')}
      props={{
        ready: page.ready,
        config,
        tally,
        tallied,
        pinned,
        simulating: page.simulating,
        simulated: page.simulated,
        onTogglePin: togglePin,
      }}
    />
  {:else}
    <section aria-labelledby="hidden-heading" class="{panelClasses} max-w-3xl">
      <h2 id="hidden-heading" class={headingClasses}>The results are waiting on your guess</h2>
      <p class={bodyClasses}>
        Make your prediction above first. Guessing before you see the answer is how you find out
        whether your intuition about loops is any good.
      </p>
      <button
        type="button"
        disabled={!page.ready}
        onclick={() => (page.showResults = true)}
        class="text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2 disabled:cursor-not-allowed"
      >
        Skip the prediction and show the results
      </button>
    </section>
  {/if}

  <section aria-labelledby="ladder-heading" class="space-y-4">
    <h2 id="ladder-heading" class={headingClasses} tabindex="-1">How strong is your marker?</h2>
    <MarkerLadder
      ready={page.ready}
      selected={config.marker}
      ladder={config.ladder}
      onSelect={selectMarker}
      onEdit={editLadder}
      onReset={resetLadder}
    />
  </section>

  <section aria-labelledby="replay-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="replay-heading" class={headingClasses}>Replay a real loop</h2>
      <p class={bodyClasses}>
        Drop the log your loop writes, one line per iteration, and see where each governor would
        have stopped it and what that would have saved. Progress means the work was kept and the
        score improved. Anything else is a stall.
      </p>
    </div>
    {#if ReplayPanel}
      <ReplayPanel
        settings={{
          stallM: config.stallM,
          maxIterations: config.maxIterations,
          budget: config.budget,
        }}
      />
    {:else if replayFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        Couldn’t load the replay. Reload the page to try again.
      </p>
    {:else}
      <p class={bodyClasses}>Loading the replay…</p>
    {/if}
  </section>

  <section aria-labelledby="tales-heading" class="space-y-4">
    <h2 id="tales-heading" class={headingClasses}>Cautionary tales</h2>
    <CautionaryTales />
  </section>

  <LoopFooter />
</div>
