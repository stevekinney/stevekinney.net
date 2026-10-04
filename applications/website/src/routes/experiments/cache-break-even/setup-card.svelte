<script lang="ts">
  import { ArrowLeftRight } from '@lucide/svelte';
  import { untrack } from 'svelte';

  import { describeRatioSource, parseRatioOverride, ratioNotes } from './calculator-state';
  import type { CalculatorState } from './calculator-state';
  import type { ChangeEvaluation } from './calculate';
  import { formatRatio } from './display';
  import {
    badgeClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
    panelClasses,
  } from './field-styles';
  import { modelOptionLabel } from './pricing';
  import type { PricingTable } from './pricing';
  import ToggleGroup from './toggle-group.svelte';
  import TokenField from './token-field.svelte';

  /** Which fields still hold a value from an import. */
  export type FieldSources = {
    fromModel: string | null;
    contextTokens: string | null;
    remainingOutput: string | null;
  };

  type Props = {
    setup: CalculatorState;
    pricing: PricingTable;
    evaluation: ChangeEvaluation;
    sources: FieldSources;
    ready: boolean;
    onChange: (patch: Partial<CalculatorState>, field?: keyof FieldSources) => void;
    onEffortChange: (side: 'from' | 'to', effort: string) => void;
    onSwap: () => void;
  };

  const { setup, pricing, evaluation, sources, ready, onChange, onEffortChange, onSwap }: Props =
    $props();

  // The ratio box shows the automatic ratio until the person types one.
  let ratioText = $state(untrack(() => formatRatio(evaluation.ratio)));
  let ratioFocused = $state(false);

  $effect(() => {
    const shown = formatRatio(evaluation.ratio);
    const typing = ratioFocused;

    // While the person types, their text stays, even when it isn't a usable ratio yet.
    if (!typing) ratioText = shown;
  });

  const handleRatioInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    ratioText = event.currentTarget.value;
    onChange({ ratioOverride: parseRatioOverride(ratioText) });
  };

  const ratioNote = $derived(ratioNotes[describeRatioSource(evaluation)]);
  const ratioInvalid = $derived(ratioText.trim() !== '' && parseRatioOverride(ratioText) === null);
</script>

{#snippet side(kind: 'from' | 'to')}
  {@const model = kind === 'from' ? setup.fromModel : setup.toModel}
  {@const effort = kind === 'from' ? setup.fromEffort : setup.toEffort}
  <fieldset class="min-w-0 space-y-3">
    <legend class="sr-only"
      >{kind === 'from' ? 'Where you’re coming from' : 'Where you’re going'}</legend
    >
    <div class="space-y-1.5">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <label for="{kind}-model" class={labelClasses}>
          {kind === 'from' ? 'From model' : 'To model'}
        </label>
        {#if kind === 'from' && sources.fromModel}
          <span class={badgeClasses}>{sources.fromModel}</span>
        {/if}
      </div>
      <select
        id="{kind}-model"
        value={model}
        disabled={!ready}
        onchange={(event) =>
          onChange(
            kind === 'from'
              ? { fromModel: event.currentTarget.value }
              : { toModel: event.currentTarget.value },
            kind === 'from' ? 'fromModel' : undefined,
          )}
        class={fieldClasses}
      >
        {#each pricing.models as option (option.id)}
          <option value={option.id} selected={option.id === model}>
            {modelOptionLabel(option)}
          </option>
        {/each}
      </select>
    </div>
    <div class="space-y-1.5">
      <label for="{kind}-effort" class={labelClasses}>at effort</label>
      <select
        id="{kind}-effort"
        value={effort}
        disabled={!ready}
        onchange={(event) => {
          // Changing an effort resets the ratio, so show the new one even if the box had focus.
          ratioFocused = false;
          onEffortChange(kind, event.currentTarget.value);
        }}
        class={fieldClasses}
      >
        {#each pricing.efforts as option (option.id)}
          <option value={option.id} selected={option.id === effort}>{option.label}</option>
        {/each}
      </select>
    </div>
  </fieldset>
{/snippet}

<section aria-labelledby="setup-heading" class={panelClasses}>
  <h2 id="setup-heading" class="text-xl font-bold text-slate-900 dark:text-white">Your setup</h2>

  <div class="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
    {@render side('from')}
    <div class="flex justify-center md:pt-6">
      <button
        type="button"
        disabled={!ready}
        onclick={() => {
          ratioFocused = false;
          onSwap();
        }}
        aria-label="Swap from and to"
        class="focus-visible:outline-primary-600 inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-slate-400 bg-white text-slate-800 shadow-sm hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
      >
        <ArrowLeftRight aria-hidden="true" class="size-5 rotate-90 md:rotate-0" />
      </button>
    </div>
    {@render side('to')}
  </div>

  <div class="grid gap-4 sm:grid-cols-2">
    <ToggleGroup
      id="ttl"
      label="Cache TTL"
      value={setup.ttl}
      disabled={!ready}
      options={[
        { value: '5m', label: '5-minute' },
        { value: '1h', label: '1-hour' },
      ]}
      onChange={(value) => onChange({ ttl: value === '5m' ? '5m' : '1h' })}
    />
    <div class="space-y-1.5">
      <label for="ratio" class={labelClasses}>Output volume ratio</label>
      <input
        id="ratio"
        type="text"
        inputmode="decimal"
        value={ratioText}
        disabled={!ready}
        oninput={handleRatioInput}
        onfocus={() => (ratioFocused = true)}
        onblur={() => (ratioFocused = false)}
        autocomplete="off"
        spellcheck="false"
        aria-invalid={ratioInvalid || undefined}
        aria-describedby="ratio-note"
        class="{fieldClasses} tabular-nums"
      />
      <p id="ratio-note" class={hintClasses}>
        {#if ratioInvalid}
          That isn’t a positive number, so the ratio from the efforts is in use.
        {:else}
          {ratioNote}
        {/if}
      </p>
    </div>
  </div>

  <div class="grid gap-5">
    <TokenField
      id="context-tokens"
      label="Tokens already in context (N)"
      value={setup.contextTokens}
      source={sources.contextTokens}
      disabled={!ready}
      onChange={(value) => onChange({ contextTokens: value }, 'contextTokens')}
    />
    <TokenField
      id="remaining-output"
      label="Remaining output work (R)"
      value={setup.remainingOutput}
      source={sources.remainingOutput}
      disabled={!ready}
      hint="R is measured at your current settings."
      onChange={(value) => onChange({ remainingOutput: value }, 'remainingOutput')}
    />
  </div>
</section>
