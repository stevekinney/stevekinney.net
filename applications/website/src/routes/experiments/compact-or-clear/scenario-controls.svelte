<script lang="ts">
  import type { Snippet } from 'svelte';

  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';
  import {
    formatSummary,
    parseDecimalField,
    parseSummaryField,
    parseTokenField,
    parseTurnsField,
  } from './field-parsing';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import FromSessionBadge from './from-session-badge.svelte';
  import { modelLabel, pricesEqual, defaultModels } from './pricing';
  import type { ModelPrice } from './pricing';
  import { clampLaterAfter, ranges, summaryNote } from './scenario';
  import type { Scenario, ScenarioField } from './scenario';
  import SliderField from './slider-field.svelte';
  import ToggleGroup from './toggle-group.svelte';
  import { summaryTokensFor } from './projection';

  type Props = {
    scenario: Scenario;
    models: ModelPrice[];
    /** Fields still showing a value from an imported session. */
    imported: Partial<Record<ScenarioField, true>>;
    /** The first turn's context from an imported session, offered as the baseline. */
    baselineEstimate: number | null;
    onChange: (patch: Partial<Scenario>) => void;
    /** Sits right below the sliders, next to the re-read control it sets. */
    rereadBuilder?: Snippet;
  };

  const { scenario, models, imported, baselineEstimate, onChange, rereadBuilder }: Props = $props();

  const summaryTokens = $derived(summaryTokensFor(scenario.contextNow, scenario.summaryPercent));
  const customPrices = $derived(!pricesEqual(models, defaultModels));
  const laterMaximum = $derived(Math.max(1, scenario.turns - 1));
  const note = $derived(summaryNote(scenario.contextNow, scenario.summaryPercent, scenario.reread));
</script>

<div class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
  <div class="space-y-1.5">
    <label for="model" class={labelClasses}>
      Model
      {#if imported.modelId}<FromSessionBadge />{/if}
      {#if customPrices}
        <span
          class="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-700"
        >
          custom prices
        </span>
      {/if}
    </label>
    <select
      id="model"
      value={scenario.modelId}
      onchange={(event) => onChange({ modelId: event.currentTarget.value })}
      class="{fieldClasses} w-full"
    >
      {#each models as model (model.id)}
        <option value={model.id}>{modelLabel(model)}</option>
      {/each}
    </select>
    <p class={hintClasses}>Dollars per million input and output tokens.</p>
  </div>

  <ToggleGroup
    id="ttl"
    label="Cache lifetime"
    value={scenario.ttl}
    options={[
      { value: '5m', label: '5-min' },
      { value: '1h', label: '1-hour' },
    ]}
    onChange={(value) => onChange({ ttl: value === '5m' ? '5m' : '1h' })}
    hint="How long a cache write lasts. A longer one costs more to write."
  />

  <ToggleGroup
    id="cache"
    label="Cache when you compact"
    value={scenario.warm ? 'warm' : 'cold'}
    options={[
      { value: 'warm', label: 'Warm' },
      { value: 'cold', label: 'Cold' },
    ]}
    onChange={(value) => onChange({ warm: value === 'warm' })}
    hint="Cold means more than the cache lifetime has passed since your last turn."
    fromSession={imported.warm === true}
  />

  <SliderField
    id="context-now"
    label="Context now"
    value={scenario.contextNow}
    range={ranges.contextNow}
    format={formatTokens}
    parse={(text) => parseTokenField(text, ranges.contextNow)}
    onChange={(contextNow) => onChange({ contextNow })}
    example="400k, 1m, or 400,000"
    hint="Tokens in the prefix every turn re-reads."
    fromSession={imported.contextNow === true}
  />

  <SliderField
    id="summary-size"
    label="Summary size"
    value={scenario.summaryPercent}
    range={ranges.summaryPercent}
    format={(percent) => formatSummary(summaryTokens, percent)}
    parse={(text) => parseSummaryField(text, scenario.contextNow)}
    onChange={(summaryPercent) => onChange({ summaryPercent })}
    example="5, 5%, or 20k"
    hint={note ?? 'A percentage of your context, or a token count over 100.'}
    fromSession={imported.summaryPercent === true}
  />

  <SliderField
    id="reread-after-clear"
    label="Re-read after clear"
    value={scenario.reread}
    range={ranges.reread}
    format={formatTokens}
    parse={(text) => parseTokenField(text, ranges.reread)}
    onChange={(reread) => onChange({ reread })}
    example="25k or 25,000"
    hint="Files and notes you’d open again after clearing."
    fromSession={imported.reread === true}
  />

  <SliderField
    id="input-per-turn"
    label="Input per turn"
    value={scenario.inputPerTurn}
    range={ranges.inputPerTurn}
    format={formatTokens}
    parse={(text) => parseTokenField(text, ranges.inputPerTurn)}
    onChange={(inputPerTurn) => onChange({ inputPerTurn })}
    example="5k or 5,000"
    hint="New tokens each turn adds, such as tool results and your messages."
    fromSession={imported.inputPerTurn === true}
  />

  <SliderField
    id="output-per-turn"
    label="Output per turn"
    value={scenario.outputPerTurn}
    range={ranges.outputPerTurn}
    format={formatTokens}
    parse={(text) => parseTokenField(text, ranges.outputPerTurn)}
    onChange={(outputPerTurn) => onChange({ outputPerTurn })}
    example="2k or 2,000"
    hint="Tokens the model writes each turn."
    fromSession={imported.outputPerTurn === true}
  />

  <SliderField
    id="turns-ahead"
    label="Turns ahead"
    value={scenario.turns}
    range={ranges.turns}
    format={String}
    parse={parseTurnsField}
    onChange={(turns) => onChange({ turns })}
    example="30, up to 500"
    hint="How far to project. The slider stops at 120, the box at 500."
  />
</div>

{#if rereadBuilder}
  <div class="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
    {@render rereadBuilder()}
  </div>
{/if}

<div class="mt-6 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
  <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
    <label
      class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
    >
      <input
        id="compact-later"
        type="checkbox"
        checked={scenario.laterEnabled}
        onchange={(event) =>
          onChange({
            laterEnabled: event.currentTarget.checked,
            laterAfter: clampLaterAfter(scenario.laterAfter, scenario.turns),
          })}
        class="accent-primary-600 size-4"
      />
      Compare compacting later
    </label>
    <p class={hintClasses}>Keep going for a few turns, then compact. Is waiting actually free?</p>
  </div>

  {#if scenario.laterEnabled}
    <div class="max-w-md">
      <SliderField
        id="compact-after"
        label="Compact after"
        value={clampLaterAfter(scenario.laterAfter, scenario.turns)}
        range={{ min: 1, max: laterMaximum, step: 1, typedMin: 1, typedMax: laterMaximum }}
        format={(turns) => `${turns} ${turns === 1 ? 'turn' : 'turns'}`}
        parse={(text) => {
          const turns = parseTurnsField(text.replace(/\s*turns?$/i, ''));

          return turns === null ? null : clampLaterAfter(turns, scenario.turns);
        }}
        onChange={(laterAfter) => onChange({ laterAfter })}
        example="1 up to {laterMaximum}"
        hint="Turns to keep going before compacting. Up to one fewer than turns ahead."
      />
    </div>
  {/if}

  <details class="group">
    <summary
      class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
    >
      Advanced
    </summary>
    <div class="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      <div class="space-y-3">
        <SliderField
          id="baseline-prefix"
          label="Baseline prefix"
          value={scenario.baseline}
          range={ranges.baseline}
          format={formatTokens}
          parse={(text) => parseTokenField(text, ranges.baseline)}
          onChange={(baseline) => onChange({ baseline })}
          example="15k or 15,000"
          hint="System prompt, tools, and project context. All three strategies carry it."
          fromSession={imported.baseline === true}
        />
        {#if baselineEstimate !== null && baselineEstimate !== scenario.baseline}
          <button
            type="button"
            onclick={() => onChange({ baseline: baselineEstimate })}
            class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer text-left text-sm underline decoration-dotted underline-offset-2 focus-visible:outline-2"
          >
            Use {formatTokens(baselineEstimate)} from your session’s first turn
          </button>
        {/if}
      </div>

      <SliderField
        id="characters-per-token"
        label="Characters per token"
        value={scenario.charsPerToken}
        range={ranges.charsPerToken}
        format={(value) => String(value)}
        parse={(text) => parseDecimalField(text, ranges.charsPerToken)}
        onChange={(charsPerToken) => onChange({ charsPerToken })}
        example="4 or 3.5"
        hint="Turns characters into tokens for the file estimate. It’s an estimate, and code often runs closer to 3."
      />
    </div>
  </details>
</div>
