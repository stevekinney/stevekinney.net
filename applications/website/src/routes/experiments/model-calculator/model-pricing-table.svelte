<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown, TriangleAlert } from '@lucide/svelte';

  import { calculateCost } from './calculate-cost';
  import { formatCompactTokenCount, formatCost, formatPrice } from '$lib/experiments/format';
  import { blendedPrice } from './model-pricing';
  import type { ModelPricing } from './model-pricing';
  import type { TokenUsage } from './token-usage';

  type SortKey = 'name' | 'input' | 'cachedInput' | 'output' | 'blended' | 'cost';
  type SortDirection = 'ascending' | 'descending';

  type Props = {
    models: ModelPricing[];
    usage: TokenUsage;
    /** Catalog IDs of the models a loaded session actually used. */
    usedModelIds?: ReadonlySet<string>;
    /** The largest single prompt in a loaded session, to flag prompt-size price tiers. */
    largestPrompt?: number | null;
  };

  const { models, usage, usedModelIds = new Set(), largestPrompt = null }: Props = $props();

  let sortKey = $state<SortKey | null>(null);
  let sortDirection = $state<SortDirection>('ascending');

  const rows = $derived(
    models.map((model, index) => ({
      model,
      index,
      blended: blendedPrice(model),
      cost: calculateCost(usage, model),
    })),
  );

  type Row = (typeof rows)[number];

  const maximumCost = $derived(rows.reduce((largest, row) => Math.max(largest, row.cost), 0));

  const sortValue = (row: Row, key: SortKey): number | string => {
    if (key === 'name') return `${row.model.name} ${row.model.variant ?? ''}`;
    if (key === 'blended') return row.blended;
    if (key === 'cost') return row.cost;

    return row.model[key];
  };

  // Ties keep the order of `model-pricing.toml`.
  const sortedRows = $derived.by(() => {
    if (sortKey === null) return rows;

    const key = sortKey;
    const direction = sortDirection === 'ascending' ? 1 : -1;

    return [...rows].sort((first, second) => {
      const a = sortValue(first, key);
      const b = sortValue(second, key);
      const comparison =
        typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b);

      return comparison * direction || first.index - second.index;
    });
  });

  const sortBy = (key: SortKey): void => {
    if (sortKey === key) {
      sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
    } else {
      sortKey = key;
      sortDirection = 'ascending';
    }
  };

  const exceedsPromptLimit = (model: ModelPricing): boolean =>
    largestPrompt !== null &&
    model.maximumPromptTokens !== undefined &&
    largestPrompt > model.maximumPromptTokens;

  const hasCacheWritePrices = (model: ModelPricing): boolean =>
    model.cacheWrite5m !== undefined || model.cacheWrite1h !== undefined;

  const numericCell = 'px-3 py-3 text-right whitespace-nowrap tabular-nums';
</script>

{#snippet sortableHeader(key: SortKey, label: string, align: 'left' | 'right')}
  <th
    scope="col"
    aria-sort={sortKey === key ? sortDirection : undefined}
    class="px-3 py-2 font-semibold {align === 'right' ? 'text-right' : 'text-left'}"
  >
    <button
      type="button"
      onclick={() => sortBy(key)}
      class="focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1 rounded whitespace-nowrap hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-white {align ===
      'right'
        ? 'flex-row-reverse'
        : ''}"
    >
      {label}
      {#if sortKey !== key}
        <ArrowUpDown aria-hidden="true" class="size-3.5 opacity-40" />
      {:else if sortDirection === 'ascending'}
        <ArrowUp aria-hidden="true" class="size-3.5" />
      {:else}
        <ArrowDown aria-hidden="true" class="size-3.5" />
      {/if}
    </button>
  </th>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
  tabindex="0"
  role="region"
  aria-label="Model pricing comparison"
>
  <table class="w-full min-w-[56rem] border-collapse text-sm">
    <caption class="sr-only">
      Prices in US dollars per million tokens, and what the token counts above cost on each model.
      Select a column heading to sort by it.
    </caption>
    <thead>
      <tr
        class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        {@render sortableHeader('name', 'Model', 'left')}
        {@render sortableHeader('input', 'Uncached input', 'right')}
        {@render sortableHeader('cachedInput', 'Cached input', 'right')}
        <th scope="col" class="px-3 py-2 text-right font-semibold">
          Cache writes
          <span class="block text-xs font-normal">5 minutes / 1 hour</span>
        </th>
        {@render sortableHeader('output', 'Output', 'right')}
        {@render sortableHeader('blended', '1M in + 1M out', 'right')}
        {@render sortableHeader('cost', 'Cost', 'right')}
      </tr>
    </thead>
    <tbody>
      {#each sortedRows as row (row.model.id)}
        {@const used = usedModelIds.has(row.model.id)}
        <tr
          class="border-b border-slate-200 dark:border-slate-800 {used
            ? 'bg-primary-50 dark:bg-primary-950/40'
            : ''}"
        >
          <th scope="row" class="px-3 py-3 text-left align-top font-normal">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="font-semibold text-slate-900 dark:text-white">{row.model.name}</span>
              {#if row.model.variant}
                <span
                  class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {row.model.variant}
                </span>
              {/if}
              {#if used}
                <span
                  class="bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-200 rounded px-1.5 py-0.5 text-xs font-semibold"
                >
                  In session
                </span>
              {/if}
            </span>
            <span class="block text-xs text-slate-500 dark:text-slate-400">
              {row.model.provider}
            </span>
            {#if row.model.maximumPromptTokens !== undefined && exceedsPromptLimit(row.model)}
              <span class="mt-1 flex items-start gap-1 text-xs text-amber-800 dark:text-amber-300">
                <TriangleAlert aria-hidden="true" class="mt-px size-3.5 flex-none" />
                This price covers prompts up to {formatCompactTokenCount(
                  row.model.maximumPromptTokens,
                )} tokens. The session sent larger ones, which cost more.
              </span>
            {/if}
          </th>
          <td class={numericCell}>{formatPrice(row.model.input)}</td>
          <td class={numericCell}>{formatPrice(row.model.cachedInput)}</td>
          <td class={numericCell}>
            {#if hasCacheWritePrices(row.model)}
              {formatPrice(row.model.cacheWrite5m ?? row.model.input)}
              <span class="text-slate-400 dark:text-slate-500">/</span>
              {formatPrice(row.model.cacheWrite1h ?? row.model.input)}
            {:else}
              <span aria-hidden="true" class="text-slate-400 dark:text-slate-500">—</span>
              <span class="sr-only">Billed as uncached input</span>
            {/if}
          </td>
          <td class={numericCell}>{formatPrice(row.model.output)}</td>
          <td class={numericCell}>{formatPrice(row.blended)}</td>
          <td class="{numericCell} w-40 align-top">
            <span class="font-semibold text-slate-900 dark:text-white">{formatCost(row.cost)}</span>
            <span
              aria-hidden="true"
              class="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <span
                class="bg-primary-500 dark:bg-primary-400 block h-full rounded-full"
                style:width="{maximumCost > 0 ? (row.cost / maximumCost) * 100 : 0}%"
              ></span>
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
