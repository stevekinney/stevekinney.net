<script lang="ts">
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

  import {
    formatSummary,
    parseSummaryField,
    parseTokenField,
    parseTurnsField,
  } from './field-parsing';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import FromSessionBadge from './from-session-badge.svelte';
  import { modelLabel } from './pricing';
  import type { ModelPrice } from './pricing';
  import { summaryTokensFor } from './projection';
  import { ranges, summaryNote } from './scenario';
  import type { Scenario, ScenarioField } from './scenario';
  import SliderField from './slider-field.svelte';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    scenario: Scenario;
    models: ModelPrice[];
    /** The model the switch line uses, which can differ from the stored choice after a collision. */
    switchId: string | null;
    /** Fields still showing a value from an imported session. */
    imported: Partial<Record<ScenarioField, true>>;
    onChange: (patch: Partial<Scenario>) => void;
  };

  const { scenario, models, switchId, imported, onChange }: Props = $props();

  const summaryTokens = $derived(summaryTokensFor(scenario.contextNow, scenario.summaryPercent));
  const note = $derived(summaryNote(scenario.contextNow, scenario.summaryPercent));
  const destinations = $derived(models.filter((model) => model.id !== scenario.modelId));
</script>

<div class="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
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
    id="turns-ahead"
    label="Turns ahead"
    value={scenario.turns}
    range={ranges.turns}
    format={String}
    parse={parseTurnsField}
    onChange={(turns) => onChange({ turns })}
    example="30, up to 500"
    hint="How much work is left. The slider stops at 120, the box at 500."
  />

  <ToggleGroup
    id="cache"
    label="Cache right now"
    value={scenario.warm ? 'warm' : 'cold'}
    options={[
      { value: 'warm', label: 'Warm' },
      { value: 'cold', label: 'Cold' },
    ]}
    onChange={(value) => onChange({ warm: value === 'warm' })}
    hint="Cold means more than the cache lifetime has passed since your last turn."
    fromSession={imported.warm === true}
  />

  <div class="space-y-1.5">
    <label for="model" class={labelClasses}>
      Model now
      {#if imported.modelId}<FromSessionBadge />{/if}
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

  <div class="space-y-1.5">
    <label for="switch-model" class={labelClasses}>Switch to</label>
    <select
      id="switch-model"
      value={switchId}
      onchange={(event) => onChange({ switchId: event.currentTarget.value })}
      class="{fieldClasses} w-full"
    >
      {#each destinations as model (model.id)}
        <option value={model.id}>{modelLabel(model)}</option>
      {/each}
    </select>
    <p class={hintClasses}>The model you'd move the rest of the session to.</p>
  </div>
</div>

<details class="group mt-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
  <summary
    class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
  >
    Assumptions
    <span class="ml-1 font-normal text-slate-500 dark:text-slate-400">
      Cache lifetime, summary size, and per-turn growth. The defaults are reasonable.
    </span>
  </summary>
  <div class="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
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
      id="baseline-prefix"
      label="Baseline prefix"
      value={scenario.baseline}
      range={ranges.baseline}
      format={formatTokens}
      parse={(text) => parseTokenField(text, ranges.baseline)}
      onChange={(baseline) => onChange({ baseline })}
      example="15k or 15,000"
      hint="System prompt, tools, and project context. Compacting keeps it."
      fromSession={imported.baseline === true}
    />
  </div>
</details>
