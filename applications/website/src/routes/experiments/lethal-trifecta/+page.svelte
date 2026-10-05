<script lang="ts">
  import { onMount } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { applySettings } from './apply-settings';
  import type { CiScenario } from './ci-scenarios';
  import ControlsPanel from './controls-panel.svelte';
  import { evaluate } from './evaluate';
  import type { TrifectaState } from './evaluate';
  import { experiment } from './experiment';
  import FooterNotes from './footer-notes.svelte';
  import LazySection from './lazy-section.svelte';
  import type { ControlId, NodeId } from './model';
  import PredictPanel from './predict-panel.svelte';
  import {
    ciState,
    customNotice,
    defaultState,
    findPreset,
    presetMatching,
    presets,
  } from './presets';
  import type { Prefill, SettingsReport } from './settings-import';
  import type SettingsLoaderComponent from './settings-loader.svelte';
  import { initialSettingsSetup } from './settings-setup';
  import type { SettingsSetup } from './settings-setup';
  import { decodeState, encodeState } from './share-link';
  import TrifectaDiagram from './trifecta-diagram.svelte';
  import { showVector } from './vectors';
  import type { Vector } from './vectors';
  import VerdictPanel from './verdict-panel.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/lethal-trifecta` },
  ]);

  const careful = findPreset('careful');
  const carefulExploitable = careful ? evaluate(careful.state()).exploitable : true;

  // One state object. Everything on the page is derived from it.
  const page = $state({
    trifecta: (careful?.state() ?? defaultState()) as TrifectaState,
    presetId: 'careful' as string | null,
    prediction: null as boolean | null,
    revealed: false,
    ready: false,
    touched: false,
    hovered: null as ControlId | null,
    prefill: null as Record<ControlId, Prefill> | null,
    settings: initialSettingsSetup() as SettingsSetup,
  });

  const evaluation = $derived(evaluate(page.trifecta));
  const notice = $derived(
    presets.find((preset) => preset.id === page.presetId)?.notice ??
      (page.trifecta.ci
        ? 'An agent in CI. Change the four choices to see which leg each adds or cuts.'
        : customNotice),
  );

  const change = (next: TrifectaState): void => {
    page.trifecta = next;
    page.presetId = presetMatching(next)?.id ?? null;
    page.touched = true;
    page.revealed = true;
  };

  const selectPreset = (id: string): void => {
    const preset = findPreset(id);
    if (!preset) return;

    change(preset.state());
  };

  const toggleNode = (id: NodeId, on: boolean): void =>
    change({ ...page.trifecta, nodes: { ...page.trifecta.nodes, [id]: on } });

  const toggleControl = (id: ControlId, on: boolean): void =>
    change({ ...page.trifecta, controls: { ...page.trifecta.controls, [id]: on } });

  const changeCi = (scenario: CiScenario | null): void => {
    const next = scenario ? ciState(scenario) : defaultState();
    change({ ...next, controls: { ...page.trifecta.controls } });
  };

  const show = (vector: Vector): void => {
    change(showVector(page.trifecta, vector));
    document.getElementById('diagram-heading')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const applyReport = (report: SettingsReport | null): void => {
    page.prefill = report?.prefill ?? null;
    if (report) change(applySettings(page.trifecta, report));
  };

  // The settings reader is the biggest part of the page, so it loads after the page is interactive.
  let SettingsLoader = $state.raw<typeof SettingsLoaderComponent | null>(null);
  let settingsFailed = $state(false);

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const decoded = decodeState(window.location.hash.slice(1));
    if (decoded) {
      page.trifecta = decoded;
      page.presetId = presetMatching(decoded)?.id ?? null;
      page.revealed = true;
    }

    page.ready = true;

    import('./settings-loader.svelte')
      .then((module) => {
        SettingsLoader = module.default;
      })
      .catch(() => {
        settingsFailed = true;
      });
  });

  // Keep the address bar in step with the toggles, once the learner has changed one.
  $effect(() => {
    if (!page.ready || !page.touched) return;

    const query = encodeState(page.trifecta);
    try {
      // SvelteKit's own replaceState, because writing to window.history directly
      // conflicts with its router.
      replaceState(`#${query}`, {});
    } catch {
      // The address bar is a convenience. The page works without it.
    }
  });

  const sectionHeading = 'text-xl font-bold text-slate-900 dark:text-white';
  const sectionIntro = 'max-w-3xl text-slate-600 dark:text-slate-300';
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Cut a leg of the lethal trifecta
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Can untrusted content steer your agent into moving private data somewhere you don’t control? A
      coding agent reads untrusted content, reaches private data, and has a way out, all by default.
      You don’t choose whether that’s true. You choose which leg to cut, and only a structural
      control cuts one.
    </p>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Turn capabilities and controls on and off, and watch whether a complete path survives. This
      page has no server and sends nothing anywhere.
    </p>
  </header>

  <section aria-labelledby="predict-heading" class="space-y-4">
    <h2 id="predict-heading" class={sectionHeading}>Predict first</h2>
    <PredictPanel
      prediction={page.prediction}
      revealed={page.revealed}
      exploitable={carefulExploitable}
      ready={page.ready}
      onPredict={(value) => {
        page.prediction = value;
        page.revealed = true;
      }}
      onSkip={() => (page.revealed = true)}
    />
  </section>

  <section aria-labelledby="presets-heading" class="space-y-4">
    <h2 id="presets-heading" class={sectionHeading}>Presets</h2>
    <div role="group" aria-label="Presets" class="flex flex-wrap gap-2">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          disabled={!page.ready}
          aria-pressed={page.presetId === preset.id}
          onclick={() => selectPreset(preset.id)}
          class="focus-visible:outline-primary-600 aria-pressed:border-primary-600 aria-pressed:bg-primary-600 dark:aria-pressed:border-primary-400 dark:aria-pressed:bg-primary-700 min-h-10 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-left text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400"
        >
          {preset.name}
        </button>
      {/each}
    </div>
    <p
      data-testid="preset-notice"
      class="max-w-3xl rounded-lg border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200"
    >
      {notice}
    </p>
  </section>

  <section aria-labelledby="verdict-heading" class="max-w-3xl space-y-4">
    <h2 id="verdict-heading" class={sectionHeading}>Verdict</h2>
    <VerdictPanel {evaluation} revealed={page.revealed} />
  </section>

  <div class="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <section aria-labelledby="diagram-heading" class="min-w-0 scroll-mt-6 space-y-4">
      <div class="space-y-1">
        <h2 id="diagram-heading" class={sectionHeading}>The diagram</h2>
        <p class={sectionIntro}>
          Tick a node to give the agent that capability. A cut edge has a dashed border and names
          the control that cut it. Edges on the highlighted path are red.
        </p>
      </div>
      <TrifectaDiagram
        {evaluation}
        showPath={page.revealed}
        hovered={page.hovered}
        ready={page.ready}
        onToggleNode={toggleNode}
      />
    </section>

    <section aria-labelledby="controls-heading" class="min-w-0 space-y-4">
      <div class="space-y-1">
        <h2 id="controls-heading" class={sectionHeading}>Controls</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Hover or focus a control to highlight the edges it removes.
        </p>
      </div>
      <ControlsPanel
        on={page.trifecta.controls}
        prefill={page.prefill}
        ready={page.ready}
        onToggle={toggleControl}
        onHover={(id) => (page.hovered = id)}
      />
      <LazySection
        load={() => import('./allowlist-panel.svelte')}
        props={{
          allowlist: page.trifecta.allowlist,
          excludedNetworkCommand: page.trifecta.excludedNetworkCommand,
          denyOn: page.trifecta.controls['default-deny-egress'],
          ready: page.ready,
          onAllowlist: (allowlist: string[]) => change({ ...page.trifecta, allowlist }),
          onExcluded: (on: boolean) => change({ ...page.trifecta, excludedNetworkCommand: on }),
        }}
        name="the allowlist"
      />
    </section>
  </div>

  <section aria-labelledby="share-heading" class="space-y-4">
    <h2 id="share-heading" class={sectionHeading}>Share or save</h2>
    <p class={sectionIntro}>
      The summary is Markdown: the verdict, the path, the controls in place by kind, and the
      residual risks. The link holds the toggles, never your settings files.
    </p>
    <LazySection
      load={() => import('./share-actions.svelte')}
      props={{ ready: page.ready, trifecta: page.trifecta, evaluation }}
      name="the share buttons"
    />
  </section>

  <section aria-labelledby="settings-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="settings-heading" class={sectionHeading}>Load your settings</h2>
      <p class={sectionIntro}>
        Upload or paste your user, project, and local settings files, and the controls fill in from
        what’s there, each with the line that justified it. Anything a settings file can’t settle
        stays as your toggle.
      </p>
    </div>
    {#if SettingsLoader}
      <SettingsLoader bind:setup={page.settings} ready={page.ready} onReport={applyReport} />
    {:else if settingsFailed}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">
        The settings reader didn’t load. Reload the page to try again.
      </p>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading the settings reader…</p>
    {/if}
  </section>

  <section aria-labelledby="ci-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="ci-heading" class={sectionHeading}>Agents in CI</h2>
      <p class={sectionIntro}>
        A CI agent is a credential-bearing process whose prompt is partly written by anyone who can
        open an issue. Each choice below adds or cuts a leg.
      </p>
    </div>
    <LazySection
      load={() => import('./ci-panel.svelte')}
      props={{ scenario: page.trifecta.ci, ready: page.ready, onChange: changeCi }}
      name="the CI scenarios"
    />
  </section>

  <section aria-labelledby="reader-doer-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="reader-doer-heading" class={sectionHeading}>Why a reader/doer split works</h2>
      <p class={sectionIntro}>
        Only the fields of a strict schema pass from the reader to the doer. Edit the text and play
        it through.
      </p>
    </div>
    <LazySection
      load={() => import('./reader-doer-demo.svelte')}
      props={{ ready: page.ready }}
      name="the reader/doer demo"
    />
  </section>

  <section aria-labelledby="vectors-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="vectors-heading" class={sectionHeading}>Vectors you might not have considered</h2>
      <p class={sectionIntro}>Show me turns the matching nodes on in the diagram.</p>
    </div>
    <LazySection
      load={() => import('./vectors-gallery.svelte')}
      props={{ ready: page.ready, onShow: show }}
      name="the vectors"
    />
  </section>

  <FooterNotes />
</div>
