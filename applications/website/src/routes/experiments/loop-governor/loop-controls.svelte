<script lang="ts">
  import { Shuffle } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { formatCost } from '$lib/experiments/format';

  import CheckField from './check-field.svelte';
  import { iterationCost } from './cost';
  import {
    bodyClasses,
    chipClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
  } from './field-styles';
  import type { CatalogModel } from './iteration-pricing';
  import { governorLabels } from './labels';
  import { markers, ranges } from './loop-config';
  import type { Config, Governors, MarkerId } from './loop-config';
  import NumberField from './number-field.svelte';
  import PricingHelper from './pricing-helper.svelte';
  import { MAXIMUM_SEED } from './random';
  import { customNotice, findPreset, presets } from './presets';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    ready: boolean;
    config: Config;
    presetId: string | null;
    models: CatalogModel[];
    pricesUpdated: string;
    onChange: (patch: Partial<Config>) => void;
    onGovernor: (id: keyof Governors, on: boolean) => void;
    onPreset: (id: string) => void;
  };

  const { ready, config, presetId, models, pricesUpdated, onChange, onGovernor, onPreset }: Props =
    $props();

  const notice = $derived(findPreset(presetId)?.notice ?? customNotice);
  const firstIteration = $derived(iterationCost(config, 0));
  const kOutOfReach = $derived(
    !config.impossible && config.governors.maxIterations && config.k > config.maxIterations,
  );
  const budgetBelowOne = $derived(config.governors.budget && config.budget < firstIteration);

  const newSeed = (): void => onChange({ seed: Math.floor(Math.random() * MAXIMUM_SEED) });
</script>

<div class="space-y-8">
  <div class="space-y-3">
    <h3 id="presets-heading" class="text-lg font-bold text-slate-900 dark:text-white">Presets</h3>
    <div role="group" aria-labelledby="presets-heading" class="flex flex-wrap gap-2">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          disabled={!ready}
          aria-pressed={presetId === preset.id}
          onclick={() => onPreset(preset.id)}
          class={chipClasses}
        >
          {preset.name}
        </button>
      {/each}
    </div>
    <p
      class="max-w-3xl text-slate-700 dark:text-slate-200"
      aria-live="polite"
      data-testid="preset-notice"
    >
      {notice}
    </p>
  </div>

  <div class="grid gap-8 lg:grid-cols-2">
    <fieldset class="min-w-0 space-y-4">
      <legend class="mb-2 text-lg font-bold text-slate-900 dark:text-white">The task</legend>
      <NumberField
        id="progress-p"
        label="Chance of real progress per iteration (p)"
        value={config.impossible ? 0 : config.p}
        range={ranges.p}
        slider
        disabled={!ready || config.impossible}
        onChange={(p) => onChange({ p })}
      />
      <NumberField
        id="progress-k"
        label="Progress iterations needed (k)"
        value={config.k}
        range={ranges.k}
        disabled={!ready}
        onChange={(k) => onChange({ k })}
      />
      {#if kOutOfReach}
        <p role="note" class="text-sm text-amber-800 dark:text-amber-200">
          The task needs {config.k} progress iterations, but the loop stops after {config.maxIterations}.
          No run can finish honestly.
        </p>
      {/if}
      <CheckField
        id="impossible"
        label="The task is impossible"
        checked={config.impossible}
        disabled={!ready}
        hint="No amount of work finishes it. The agent either cheats, takes a way out, or loops."
        onChange={(impossible) => onChange(impossible ? { impossible, p: 0 } : { impossible })}
      />
      <CheckField
        id="honest-way-out"
        label="Give the agent an honest way out (BLOCKED)"
        checked={config.honestWayOut}
        disabled={!ready}
        hint="Only an impossible task uses it. An agent that doesn’t cheat says BLOCKED and stops."
        onChange={(honestWayOut) => onChange({ honestWayOut })}
      />
      {#if config.impossible}
        <div class="space-y-3 rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
          <p class={bodyClasses}>
            Cited, and editable: in <a
              href="https://arxiv.org/abs/2510.20270"
              class="text-primary-700 dark:text-primary-300 underline">ImpossibleBench</a
            >, giving GPT-5 a way to flag the task for a human cut cheating from 54% to 9%. Each run
            draws once whether it cheats.
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <NumberField
              id="cheat-without"
              label="Cheats without a way out"
              value={config.cheatWithout}
              range={ranges.cheat}
              disabled={!ready}
              onChange={(cheatWithout) => onChange({ cheatWithout })}
            />
            <NumberField
              id="cheat-with"
              label="Cheats with a way out"
              value={config.cheatWith}
              range={ranges.cheat}
              disabled={!ready}
              onChange={(cheatWith) => onChange({ cheatWith })}
            />
          </div>
        </div>
      {/if}
    </fieldset>

    <fieldset class="min-w-0 space-y-4">
      <legend class="mb-2 text-lg font-bold text-slate-900 dark:text-white">The oracle</legend>
      <div class="space-y-1.5">
        <label for="marker" class={labelClasses}>Completion marker</label>
        <select
          id="marker"
          value={config.marker}
          disabled={!ready}
          onchange={(event) => onChange({ marker: event.currentTarget.value as MarkerId })}
          class="{fieldClasses} w-full"
        >
          {#each markers as marker (marker.id)}
            <option value={marker.id}
              >{marker.name.replaceAll('`', '')} (q = {config.ladder[marker.id]})</option
            >
          {/each}
        </select>
        <p class={hintClasses}>
          q is the chance per iteration that the agent claims done before it is. The values are
          illustrative, not measured. Edit them on <a href="#ladder-heading" class="underline"
            >the marker ladder</a
          >.
        </p>
      </div>
      <CheckField
        id="dual-condition"
        label="Dual condition"
        checked={config.dual}
        disabled={!ready}
        hint="The marker and a deterministic check must agree. A premature claim is logged, and the loop goes on."
        onChange={(dual) => onChange({ dual })}
      />
      <NumberField
        id="measurement-e"
        label="Chance the measurement throws (e)"
        value={config.e}
        range={ranges.e}
        slider
        disabled={!ready}
        onChange={(e) => onChange({ e })}
      />
      <ToggleGroup
        id="failure-mode"
        label="When the measurement throws"
        value={config.failureMode}
        options={[
          { value: 'open', label: 'Fail open' },
          { value: 'closed', label: 'Fail closed' },
        ]}
        disabled={!ready}
        hint={config.failureMode === 'open'
          ? 'A thrown measurement reads as zero remaining, so the run ends falsely done.'
          : 'A thrown measurement stops the loop as broken.'}
        onChange={(failureMode) => onChange({ failureMode })}
      />
    </fieldset>

    <fieldset class="min-w-0 space-y-4">
      <legend class="mb-2 text-lg font-bold text-slate-900 dark:text-white">Cost</legend>
      <ToggleGroup
        id="context"
        label="Context"
        value={config.context}
        options={[
          { value: 'fresh', label: 'Fresh (external loop)' },
          { value: 'accumulating', label: 'Accumulating (in session)' },
        ]}
        disabled={!ready}
        hint={config.context === 'fresh'
          ? 'Each iteration costs c₀ + r.'
          : 'Iteration i, counting from 0, costs c₀ + g × i.'}
        onChange={(context) => onChange({ context })}
      />
      <div class="grid gap-3 sm:grid-cols-3">
        <NumberField
          id="cost-c0"
          label="c₀ per iteration"
          prefix="$"
          value={config.c0}
          range={ranges.c0}
          disabled={!ready}
          onChange={(c0) => onChange({ c0 })}
        />
        <NumberField
          id="cost-r"
          label="r, fresh re-read"
          prefix="$"
          value={config.r}
          range={ranges.r}
          disabled={!ready}
          onChange={(r) => onChange({ r })}
        />
        <NumberField
          id="cost-g"
          label="g, growth per iteration"
          prefix="$"
          value={config.g}
          range={ranges.g}
          disabled={!ready}
          onChange={(g) => onChange({ g })}
        />
      </div>
      <PricingHelper {ready} {models} {pricesUpdated} onApply={(prices) => onChange(prices)} />
    </fieldset>

    <fieldset class="min-w-0 space-y-4">
      <legend class="mb-2 text-lg font-bold text-slate-900 dark:text-white">Governors</legend>
      <p class={bodyClasses}>
        Checked after every iteration. The first one that fires ends the run.
      </p>
      <CheckField
        id="governor-max"
        label={governorLabels.maxIterations}
        checked={config.governors.maxIterations}
        disabled={!ready}
        onChange={(on) => onGovernor('maxIterations', on)}
      >
        <NumberField
          id="max-iterations"
          label="Stop after this many iterations"
          value={config.maxIterations}
          range={ranges.maxIterations}
          disabled={!ready}
          onChange={(maxIterations) => onChange({ maxIterations })}
        />
      </CheckField>
      <CheckField
        id="governor-budget"
        label={governorLabels.budget}
        checked={config.governors.budget}
        disabled={!ready}
        hint="Checked after each iteration, so a run can go over by up to one iteration’s cost."
        onChange={(on) => onGovernor('budget', on)}
      >
        <NumberField
          id="budget"
          label="Stop once spending reaches"
          prefix="$"
          value={config.budget}
          range={ranges.budget}
          disabled={!ready}
          onChange={(budget) => onChange({ budget })}
        />
      </CheckField>
      {#if budgetBelowOne}
        <p role="note" class="text-sm text-amber-800 dark:text-amber-200">
          The budget is less than one iteration’s {formatCost(firstIteration)}, so every run stops
          after its first iteration, already over budget.
        </p>
      {/if}
      <CheckField
        id="governor-stall"
        label={governorLabels.stall}
        checked={config.governors.stall}
        disabled={!ready}
        onChange={(on) => onGovernor('stall', on)}
      >
        <NumberField
          id="stall-m"
          label="Stop after this many iterations without progress (m)"
          value={config.stallM}
          range={ranges.stallM}
          disabled={!ready}
          onChange={(stallM) => onChange({ stallM })}
        />
      </CheckField>
      <CheckField
        id="governor-repeat"
        label={governorLabels.repeatedFailure}
        checked={config.governors.repeatedFailure}
        disabled={!ready}
        hint="Stops when the same failure shows up twice in a row."
        onChange={(on) => onGovernor('repeatedFailure', on)}
      >
        <NumberField
          id="repeat-chance"
          label="Chance a failure repeats the one before"
          value={config.repeatChance}
          range={ranges.repeatChance}
          disabled={!ready}
          hint="Illustrative. The simulation needs some way to say two failures are the same."
          onChange={(repeatChance) => onChange({ repeatChance })}
        />
      </CheckField>
      <CheckField
        id="governor-stop-file"
        label={governorLabels.stopFile}
        checked={config.governors.stopFile}
        disabled={!ready}
        hint="Checked at the start of every iteration. Only a person can touch it, so it never fires in the simulated runs. Try it on the animated run below."
        onChange={(on) => onGovernor('stopFile', on)}
      />
      {#if !config.governors.maxIterations && !config.governors.budget && !config.governors.stall && !config.governors.repeatedFailure}
        <p class="text-sm text-slate-600 dark:text-slate-300">
          With no governor that fires on its own, a run that never finishes is cut off at 2,000
          iterations and counted as runaway.
        </p>
      {/if}
    </fieldset>
  </div>

  <fieldset class="min-w-0 space-y-3">
    <legend class="mb-2 text-lg font-bold text-slate-900 dark:text-white">Simulation</legend>
    <div class="flex flex-wrap items-end gap-4">
      <div class="w-40">
        <NumberField
          id="runs"
          label="Simulated runs"
          value={config.runs}
          range={ranges.runs}
          disabled={!ready}
          onChange={(runs) => onChange({ runs })}
        />
      </div>
      <div class="w-40">
        <NumberField
          id="seed"
          label="Seed"
          value={config.seed}
          range={ranges.seed}
          disabled={!ready}
          onChange={(seed) => onChange({ seed })}
        />
      </div>
      <Button variant="secondary" size="small" icon={Shuffle} disabled={!ready} onclick={newSeed}>
        New seed
      </Button>
    </div>
    <p class={hintClasses}>
      Every random draw comes from this seed, so the same seed always gives the same runs. Up to
      10,000 runs.
    </p>
  </fieldset>
</div>
