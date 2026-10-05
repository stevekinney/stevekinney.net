<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/svelte';
  import type { Attachment } from 'svelte/attachments';

  import { formatPlainDollars, formatSignedDollars, formatTokens } from './display';
  import { headingClasses } from './field-styles';
  import { sortOptions } from './options';
  import type { OptionRow, OptionSortKey, SortDirection } from './options';

  type Props = {
    rows: OptionRow[];
    /** The key of the destination that's selected now, as `model:effort`. */
    selectedKey: string;
    onSelect: (row: OptionRow) => void;
  };

  const { rows, selectedKey, onSelect }: Props = $props();

  let sortKey = $state<OptionSortKey>('net');
  let sortDirection = $state<SortDirection>('descending');

  const sorted = $derived(sortOptions(rows, sortKey, sortDirection));

  const sortBy = (key: OptionSortKey): void => {
    if (sortKey === key) {
      sortDirection = sortDirection === 'ascending' ? 'descending' : 'ascending';
    } else {
      sortKey = key;
      // Money columns start with the best, and the break-even starts with the smallest.
      sortDirection = key === 'net' || key === 'value' ? 'descending' : 'ascending';
    }
  };

  // Each destination has a button, which is what keyboards and screen readers use.
  // This lets a pointer click anywhere on the row do the same thing.
  const clickableRows: Attachment<HTMLElement> = (tbody) => {
    const handleClick = (event: MouseEvent): void => {
      if (!(event.target instanceof Element) || event.target.closest('button')) return;

      const key = event.target.closest('tr')?.getAttribute('data-option-key');
      const row = rows.find((candidate) => candidate.key === key);
      if (row) onSelect(row);
    };

    tbody.addEventListener('click', handleClick);

    return () => tbody.removeEventListener('click', handleClick);
  };
</script>

{#snippet sortableHeader(key: OptionSortKey, label: string, align: 'left' | 'right')}
  <th
    scope="col"
    aria-sort={sortKey === key ? sortDirection : undefined}
    class="px-3 py-2 font-semibold {align === 'right' ? 'text-right' : 'text-left'}"
  >
    <button
      type="button"
      onclick={() => sortBy(key)}
      class="focus-visible:outline-primary-600 inline-flex cursor-pointer items-center gap-1 rounded font-semibold hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:text-white {align ===
      'right'
        ? 'flex-row-reverse text-right'
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

<section aria-labelledby="options-heading" class="space-y-3">
  <div class="space-y-1">
    <h2 id="options-heading" class={headingClasses}>Every option from here</h2>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Each model at each effort level, from your current setup with your context, remaining work,
      and TTL. Choose a row to make it the destination. Muted rows never pay back.
    </p>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
    tabindex="0"
    role="region"
    aria-label="Destinations"
  >
    <table class="w-full min-w-[46rem] border-collapse text-sm" data-options-table>
      <caption class="sr-only">
        Cost to change, value of remaining work, net, and break-even remaining output for each
        destination. Select a column heading to sort by it, and a destination to choose it.
      </caption>
      <thead>
        <tr
          class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
        >
          {@render sortableHeader('destination', 'Destination', 'left')}
          {@render sortableHeader('cost', 'Cost to change', 'right')}
          {@render sortableHeader('value', 'Value of remaining work', 'right')}
          {@render sortableHeader('net', 'Net', 'right')}
          {@render sortableHeader('breakEven', 'Break-even R', 'right')}
          <th scope="col" class="px-3 py-2 text-left font-semibold">
            Free via cache-preserving effort change
          </th>
        </tr>
      </thead>
      <tbody {@attach clickableRows}>
        {#each sorted as row (row.key)}
          {@const never = !row.evaluation.unchanged && row.evaluation.breakEvenOutput === null}
          {@const selected = row.key === selectedKey}
          <tr
            data-option-key={row.key}
            class="cursor-pointer border-b border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60 {selected
              ? 'bg-primary-50 dark:bg-primary-950/40'
              : ''} {never || row.evaluation.unchanged
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-slate-900 dark:text-slate-100'}"
          >
            <th scope="row" class="px-3 py-2 text-left font-medium">
              <button
                type="button"
                aria-pressed={selected}
                onclick={() => onSelect(row)}
                class="focus-visible:outline-primary-600 cursor-pointer rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {row.model.name} at {row.effort.label}
              </button>
              {#if row.evaluation.unchanged}
                <span class="ml-1 text-xs font-normal">(your current setup)</span>
              {/if}
            </th>
            <td class="px-3 py-2 text-right tabular-nums">
              {formatPlainDollars(row.evaluation.cost)}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {formatPlainDollars(row.evaluation.value)}
            </td>
            <td class="px-3 py-2 text-right font-semibold tabular-nums">
              {formatSignedDollars(row.evaluation.net)}
            </td>
            <td class="px-3 py-2 text-right tabular-nums">
              {#if row.evaluation.unchanged}
                —
              {:else if never}
                never
              {:else}
                {formatTokens(row.evaluation.breakEvenOutput ?? 0)}
              {/if}
            </td>
            <td class="px-3 py-2">
              {#if row.evaluation.cachePreserving}
                <span
                  class="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-900/50 dark:text-sky-100"
                >
                  Free with a per-request effort setting
                </span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
