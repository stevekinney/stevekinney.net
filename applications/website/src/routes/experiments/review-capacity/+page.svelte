<script lang="ts">
  import { onMount } from 'svelte';

  import { replaceState } from '$app/navigation';
  import SEO from '$lib/components/seo.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import DailyBalance from './daily-balance.svelte';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses } from './field-styles';
  import FooterNotes from './footer-notes.svelte';
  import InputsPanel from './inputs-panel.svelte';
  import LazySection from './lazy-section.svelte';
  import { allFreshEscapedPerDay, dailyBalance, simulate, sweep } from './model';
  import PredictCard from './predict-card.svelte';
  import ProjectionSection from './projection-section.svelte';
  import { clampField, defaultScenario } from './scenario';
  import type { NumericField, Scenario } from './scenario';
  import { encodeScenario, scenarioFromLink } from './share-link';
  import SplitHelper from './split-helper.svelte';
  import SweepSection from './sweep-section.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/review-capacity` },
  ]);

  // One state object. Everything on the page is derived from it.
  const page = $state({
    scenario: { ...defaultScenario } as Scenario,
    guess: '',
    revealed: null as { skipped: boolean } | null,
    ready: false,
    touched: false,
  });

  const scenario = $derived(page.scenario);
  const balance = $derived(dailyBalance(scenario));
  const queued = $derived(simulate(scenario, 'queue'));
  const tired = $derived(simulate(scenario, 'tired'));
  const points = $derived(sweep(scenario));
  const allFreshPerDay = $derived(allFreshEscapedPerDay(scenario));

  const change = (patch: Partial<Scenario>): void => {
    Object.assign(page.scenario, patch);
    page.touched = true;
  };

  const loadMeasured = (values: { linesPerPr: number; prsPerAgent: number }): void => {
    const patch: Partial<Scenario> = {};
    for (const [field, value] of Object.entries(values) as [NumericField, number][]) {
      patch[field] = clampField(field, value);
    }
    change(patch);
    // The inputs sit behind the prediction, so loading numbers opens them.
    page.revealed ??= { skipped: true };
  };

  onMount(() => {
    // The hash doesn't exist while the page prerenders, so it's read here.
    const shared = scenarioFromLink(window.location.hash.slice(1));
    if (shared) page.scenario = shared;

    page.ready = true;
  });

  // Keep the address bar in step with the inputs, once a person has changed one.
  $effect(() => {
    if (!page.ready || !page.touched) return;

    const query = encodeScenario(page.scenario);

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
      How many agents can you actually review?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Parallel agents multiply what gets generated. What gets reviewed and accepted is capped by
      your good sittings each day. This page compares the two, projects the backlog or the escaped
      defects over two working weeks, and ends with a short game about approval fatigue. Everything
      runs in this tab.
    </p>
  </header>

  <PredictCard
    {scenario}
    guess={page.guess}
    revealed={page.revealed}
    ready={page.ready}
    onGuess={(guess) => (page.guess = guess)}
    onReveal={(skipped) => (page.revealed = { skipped })}
  />

  {#if page.revealed}
    <InputsPanel
      {scenario}
      ready={page.ready}
      onChange={change}
      onPreset={(preset) => {
        page.scenario = { ...preset };
        page.touched = true;
      }}
    />

    <section aria-labelledby="balance-heading" class="space-y-4">
      <div class="max-w-3xl space-y-1">
        <h2 id="balance-heading" class={headingClasses}>Your daily balance</h2>
        <p class={bodyClasses}>
          What the agents open against what you can review well, and what that costs you in minutes.
        </p>
      </div>
      <DailyBalance {balance} {scenario} />
    </section>

    <section aria-labelledby="projection-heading" class="space-y-4">
      <div class="max-w-3xl space-y-1">
        <h2 id="projection-heading" class={headingClasses}>
          The next {scenario.days} working {scenario.days === 1 ? 'day' : 'days'}
        </h2>
        <p class={bodyClasses}>
          Over capacity, the extra work either waits or gets reviewed tired. Pick a policy to see
          what it does.
        </p>
      </div>
      <ProjectionSection
        {scenario}
        {queued}
        {tired}
        {allFreshPerDay}
        ready={page.ready}
        onPolicy={(policy) => change({ policy })}
      />
      <LazySection
        name="the export buttons"
        load={() => import('./share-actions.svelte')}
        props={{ ready: page.ready, scenario }}
      />
    </section>

    <section aria-labelledby="sweep-heading" class="space-y-4">
      <div class="max-w-3xl space-y-1">
        <h2 id="sweep-heading" class={headingClasses}>From one agent to ten</h2>
        <p class={bodyClasses}>
          Everything else held where it is, here’s what each extra agent does to the backlog and to
          the defects that get past you.
        </p>
      </div>
      <SweepSection {points} sustainable={balance.sustainableAgents} days={scenario.days} />
    </section>
  {/if}

  <section aria-labelledby="split-heading" class="max-w-3xl space-y-4">
    <div class="space-y-1">
      <h2 id="split-heading" class={headingClasses}>Split the pull request</h2>
      <p class={bodyClasses}>
        How many effective sittings a pull request needs, and the reviewable units to cut it into.
      </p>
    </div>
    <SplitHelper
      initialLines={scenario.linesPerPr}
      linesPerSitting={scenario.linesPerSitting}
      minutesPerSitting={scenario.minutesPerSitting}
      ready={page.ready}
    />
  </section>

  <section aria-labelledby="throughput-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="throughput-heading" class={headingClasses}>Measure your real throughput</h2>
      <p class={bodyClasses}>
        Paste a listing of merged pull requests to see how big they really are, how many land a day,
        and how many come from agents. Then load the numbers into the simulator.
      </p>
    </div>
    <LazySection
      name="the listing reader"
      load={() => import('./throughput-panel.svelte')}
      props={{
        linesPerSitting: scenario.linesPerSitting,
        agents: scenario.agents,
        onLoad: loadMeasured,
      }}
    />
  </section>

  <section aria-labelledby="game-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="game-heading" class={headingClasses}>Feel the tenth approval</h2>
      <p class={bodyClasses}>
        Twenty approval prompts, one of them dangerous, somewhere from the tenth on. See whether you
        catch it, and how your pace changes as you go.
      </p>
    </div>
    <LazySection
      name="the approval game"
      load={() => import('./approval-game.svelte')}
      props={{}}
    />
  </section>

  <FooterNotes />
</div>
