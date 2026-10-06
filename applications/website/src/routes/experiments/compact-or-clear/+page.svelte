<script lang="ts">
  import { onMount, untrack } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import { formatCost } from '$lib/experiments/format';
  import LazySection from '$lib/experiments/lazy-section.svelte';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { assessCache } from './calibrate';
  import type { Calibration } from './calibrate';
  import { experiment } from './experiment';
  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import { calibrationPatch, discardPatch, mergeBackup } from './import-state';
  import type { ImportedFields } from './import-state';
  import { paybacks, PAYBACK_HORIZON, project } from './projection';
  import RuleOfThumb from './rule-of-thumb.svelte';
  import { createScenario, findModel, switchModel, toProjectionInputs } from './scenario';
  import type { Scenario, ScenarioField } from './scenario';
  import ScenarioControls from './scenario-controls.svelte';
  import SpendChart from './spend-chart.svelte';
  import { paybackPhrase, verdictSentence } from './verdict';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/compact-or-clear` },
  ]);

  // One state object. Everything on the page is derived from it.
  const calculator = $state({
    // The prices are fixed for the life of the page, so only their first value is wanted.
    scenario: untrack(() => createScenario(data.pricing)),
    calibration: null as Calibration | null,
    /** Fields still showing a value from the session, until the person edits them. */
    imported: {} as ImportedFields,
    backup: null as Partial<Scenario> | null,
  });

  const models = $derived(data.pricing.models);
  const scenario = $derived(calculator.scenario);
  const model = $derived(findModel(models, scenario.modelId));
  const destination = $derived(switchModel(models, scenario.modelId, scenario.switchId));
  const inputs = $derived(toProjectionInputs(scenario, models));
  const projection = $derived(project(inputs));
  const payback = $derived(paybacks(inputs, projection));
  const verdict = $derived(verdictSentence(projection, scenario.turns, destination?.name ?? null));

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

  /** A person changed a control. */
  const change = (patch: Partial<Scenario>): void => {
    Object.assign(calculator.scenario, patch);
    for (const field of Object.keys(patch) as ScenarioField[]) delete calculator.imported[field];

    // A calibrated cache setting follows the TTL until the person sets it.
    if (patch.ttl !== undefined && calculator.imported.warm && calculator.calibration) {
      const next = assessCache(calculator.calibration.lastTimestamp, Date.now(), patch.ttl);
      if (next) calculator.scenario.warm = next.warm;
    }
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
  };

  const discardImport = (): void => {
    Object.assign(calculator.scenario, discardPatch(calculator.backup, calculator.imported));
    calculator.imported = {};
    calculator.backup = null;
    calculator.calibration = null;
  };

  onMount(() => {
    const timer = setInterval(() => (now = Date.now()), 15_000);

    return () => clearInterval(timer);
  });
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Keep going, compact, or switch models?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      Every turn re-reads your whole conversation, so a big context gets expensive. Compacting
      shrinks it and switching to a cheaper model lowers the price of every turn, but each costs
      something once. Here is when that pays off.
    </p>
  </header>

  <RuleOfThumb pricing={data.pricing} />

  <section aria-labelledby="scenario-heading" class={panelClasses}>
    <div class="space-y-1">
      <h2 id="scenario-heading" class={headingClasses}>Check it against your session</h2>
      <p class={bodyClasses}>Change the scenario to match what you're doing.</p>
    </div>
    <ScenarioControls
      {scenario}
      {models}
      switchId={destination?.id ?? null}
      imported={calculator.imported}
      onChange={change}
    />
  </section>

  <section aria-labelledby="chart-heading" class="space-y-4">
    <div class="max-w-3xl space-y-2">
      <h2 id="chart-heading" class={headingClasses}>What each move costs from here</h2>
      <p class="text-lg font-semibold text-slate-900 dark:text-white" data-testid="verdict">
        {verdict}
      </p>
      <p class={bodyClasses} data-testid="paybacks">
        {#if projection.compactCannotPay}
          Compacting can’t pay: the summary plus the baseline is no smaller than your context.
        {:else}
          Compacting costs {formatCost(projection.parts.total)} up front and {paybackPhrase(
            payback.compact,
            scenario.turns,
            Math.max(scenario.turns, PAYBACK_HORIZON),
          )}.
        {/if}
        {#if destination}
          Switching to {destination.name} costs {formatCost(projection.switchCost)} up front and {paybackPhrase(
            payback.switch,
            scenario.turns,
            Math.max(scenario.turns, PAYBACK_HORIZON),
          )}.
        {/if}
      </p>
    </div>
    <SpendChart {projection} turns={scenario.turns} />
  </section>

  <section aria-labelledby="calibrate-heading" class="space-y-4">
    <div class="max-w-3xl space-y-1">
      <h2 id="calibrate-heading" class={headingClasses}>Start from your own session</h2>
      <p class={bodyClasses}>
        Optional. Drop a Claude Code transcript and the scenario fills in with your real context
        size, turn sizes, model, cache state, and how much your compactions actually shrink the
        context.
      </p>
    </div>
    <LazySection
      name="the session reader"
      load={() => import('./calibration-panel.svelte')}
      props={{
        calibration: calculator.calibration,
        models,
        assessment,
        cacheOverridden: calculator.calibration !== null && !calculator.imported.warm,
        baseline: scenario.baseline,
        onCalibrated: applyCalibration,
        onDiscard: discardImport,
        onUseBaseline: (baseline: number) => change({ baseline }),
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
        destination,
        rates: inputs.rates,
        switchRates: inputs.switchRates,
        ttl: scenario.ttl,
        updated: data.pricing.updated,
      }}
    />
  </section>
</div>
