<script lang="ts">
  import { Calculator } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { formatCalendarDate, formatCost, formatPrice } from '$lib/experiments/format';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import {
    DEFAULT_MODEL_ID,
    defaultTokens,
    findCatalogModel,
    priceIteration,
  } from './iteration-pricing';
  import type { CatalogModel, IterationPrices, IterationTokens } from './iteration-pricing';
  import NumberField from './number-field.svelte';

  type Props = {
    ready: boolean;
    models: CatalogModel[];
    pricesUpdated: string;
    onApply: (prices: IterationPrices) => void;
  };

  const { ready, models, pricesUpdated, onApply }: Props = $props();

  const tokenRange = { min: 0, max: 10_000_000, step: 1 };

  let modelId = $state(DEFAULT_MODEL_ID);
  let tokens = $state<IterationTokens>({ ...defaultTokens });
  let applied = $state(false);

  const model = $derived(findCatalogModel(models, modelId) ?? models[0]);
  const prices = $derived(model ? priceIteration(model, tokens) : null);

  const update = (patch: Partial<IterationTokens>): void => {
    tokens = { ...tokens, ...patch };
    applied = false;
  };
</script>

<details class="rounded-md border border-slate-200 p-3 dark:border-slate-700">
  <summary
    class="focus-visible:outline-primary-600 cursor-pointer font-semibold text-slate-800 focus-visible:outline-2 dark:text-slate-100"
  >
    Price an iteration from a model
  </summary>
  <div class="mt-3 space-y-3">
    <p class={hintClasses}>
      Prices come from the same table as <a
        href="/experiments/model-calculator"
        class="text-primary-700 dark:text-primary-300 underline">the model calculator</a
      >, last checked {formatCalendarDate(pricesUpdated)}.
    </p>
    <div class="space-y-1.5">
      <label for="pricing-model" class={labelClasses}>Model</label>
      <select
        id="pricing-model"
        value={modelId}
        disabled={!ready}
        onchange={(event) => {
          modelId = event.currentTarget.value;
          applied = false;
        }}
        class="{fieldClasses} w-full"
      >
        {#each models as option (option.id)}
          <option value={option.id}
            >{option.name} ({formatPrice(option.input)} in, {formatPrice(option.output)} out)</option
          >
        {/each}
      </select>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <NumberField
        id="tokens-prompt"
        label="Input tokens per iteration"
        value={tokens.prompt}
        range={tokenRange}
        disabled={!ready}
        onChange={(prompt) => update({ prompt })}
      />
      <NumberField
        id="tokens-output"
        label="Output tokens per iteration"
        value={tokens.output}
        range={tokenRange}
        disabled={!ready}
        onChange={(output) => update({ output })}
      />
      <NumberField
        id="tokens-reread"
        label="Tokens re-read from disk (fresh)"
        value={tokens.reread}
        range={tokenRange}
        disabled={!ready}
        onChange={(reread) => update({ reread })}
      />
      <NumberField
        id="tokens-growth"
        label="History growth per iteration (in session)"
        value={tokens.growth}
        range={tokenRange}
        disabled={!ready}
        onChange={(growth) => update({ growth })}
      />
    </div>
    <label class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        checked={tokens.growthCached}
        disabled={!ready}
        onchange={(event) => update({ growthCached: event.currentTarget.checked })}
        class="accent-primary-600 mt-0.5 size-4 flex-none"
      />
      <span
        >The history is read from a warm prompt cache. Leave this off for a loop that waits longer
        than the cache lives, which pays the full input price every time.</span
      >
    </label>
    {#if prices}
      <p
        class="text-sm text-slate-700 tabular-nums dark:text-slate-200"
        data-testid="priced-iteration"
      >
        c₀ = {formatCost(prices.c0)}, r = {formatCost(prices.r)}, g = {formatCost(prices.g)}
      </p>
      <Button
        variant="secondary"
        size="small"
        icon={Calculator}
        disabled={!ready}
        onclick={() => {
          onApply(prices);
          applied = true;
        }}
      >
        Use these costs
      </Button>
      {#if applied}<p class={hintClasses} role="status">Applied.</p>{/if}
    {/if}
  </div>
</details>
