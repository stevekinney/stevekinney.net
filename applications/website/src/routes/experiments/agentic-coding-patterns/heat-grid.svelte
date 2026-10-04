<script lang="ts">
  import { heatLevel } from './explorer-state';
  import type { Filters, GridData, GridDimension } from './explorer-state';

  type Props = {
    grid: GridData;
    gridBy: GridDimension;
    filters: Filters;
    /** The grid's buttons need the page's handlers, so they wait for it to hydrate. */
    ready: boolean;
    /** A click on a cell (both set), a row total (only the category), or a column total (only the label). */
    onSelect: (selection: { category: string | null; label: string | null }) => void;
    onChangeDimension: (dimension: GridDimension) => void;
  };

  const { grid, gridBy, filters, ready, onSelect, onChangeDimension }: Props = $props();

  // Five steps of one hue, lightest to darkest in light mode and darkest to
  // lightest in dark mode, so a bigger count is always the more prominent cell.
  const heatClasses = [
    'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400',
    'bg-primary-100 text-primary-950 dark:bg-primary-950 dark:text-primary-100',
    'bg-primary-200 text-primary-950 dark:bg-primary-900 dark:text-primary-50',
    'bg-primary-300 text-primary-950 dark:bg-primary-800 dark:text-white',
    'bg-primary-600 text-white dark:bg-primary-600 dark:text-white',
    'bg-primary-800 text-white dark:bg-primary-300 dark:text-primary-950',
  ];

  const dimensions: { key: GridDimension; label: string }[] = [
    { key: 'maturity', label: 'Maturity' },
    { key: 'confidence', label: 'Confidence' },
  ];

  const activeLabel = $derived(filters[gridBy]);

  const entryCount = (count: number): string => `${count} ${count === 1 ? 'entry' : 'entries'}`;

  const buttonClass =
    'focus-visible:outline-primary-600 dark:focus-visible:outline-primary-300 flex min-h-11 w-full min-w-14 cursor-pointer items-center justify-center rounded px-2 text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-wait aria-pressed:ring-2 aria-pressed:ring-slate-900 dark:aria-pressed:ring-white';
  const totalClass = 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white';
</script>

<section aria-labelledby="grid-heading" class="space-y-3">
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="space-y-1">
      <h2 id="grid-heading" class="text-xl font-bold text-slate-900 dark:text-white">
        The field at a glance
      </h2>
      <p class="max-w-prose text-sm text-slate-600 dark:text-slate-300">
        How many entries fall in each category and each {gridBy}. Choose a cell to filter the list
        below, and choose it again to clear the filter.
      </p>
    </div>
    <div role="group" aria-label="Columns show" class="flex gap-1.5">
      {#each dimensions as { key, label } (key)}
        <button
          type="button"
          aria-pressed={gridBy === key}
          disabled={!ready}
          onclick={() => onChangeDimension(key)}
          class="focus-visible:outline-primary-600 cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:border-transparent aria-pressed:bg-slate-900 aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:bg-white dark:aria-pressed:text-slate-900"
        >
          {label}
        </button>
      {/each}
    </div>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
    tabindex="0"
    role="region"
    aria-label="Entries by category and {gridBy}"
  >
    <table class="w-full min-w-[30rem] border-separate border-spacing-1 text-sm">
      <caption class="sr-only">
        The number of entries in each category, split by {gridBy}. Each count is a button that
        filters the list.
      </caption>
      <thead>
        <tr class="text-slate-600 dark:text-slate-300">
          <th scope="col" class="px-2 py-1 text-left font-semibold">Category</th>
          {#each grid.columns as column (column.key)}
            <th scope="col" class="px-2 py-1 text-center font-semibold capitalize">
              {column.label}
            </th>
          {/each}
          <th scope="col" class="px-2 py-1 text-center font-semibold">All</th>
        </tr>
      </thead>
      <tbody>
        {#each grid.rows as row (row.category)}
          <tr>
            <th
              scope="row"
              class="px-2 py-1 text-left font-medium text-slate-800 dark:text-slate-100"
            >
              {row.category}
            </th>
            {#each grid.columns as column, index (column.key)}
              {@const count = row.cells[index] ?? 0}
              <td class="p-0">
                <button
                  type="button"
                  disabled={!ready}
                  aria-pressed={filters.category === row.category && activeLabel === column.key}
                  aria-label="{row.category}, {column.label}: {entryCount(count)}"
                  onclick={() => onSelect({ category: row.category, label: column.key })}
                  class="{buttonClass} {heatClasses[heatLevel(count, grid.maximum)]}"
                >
                  <span aria-hidden="true">{count === 0 ? '·' : count}</span>
                </button>
              </td>
            {/each}
            <td class="p-0">
              <button
                type="button"
                disabled={!ready}
                aria-pressed={filters.category === row.category && activeLabel === null}
                aria-label="{row.category}, all: {entryCount(row.total)}"
                onclick={() => onSelect({ category: row.category, label: null })}
                class="{buttonClass} {totalClass}"
              >
                <span aria-hidden="true">{row.total}</span>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <th
            scope="row"
            class="px-2 py-1 text-left font-semibold text-slate-800 dark:text-slate-100"
          >
            All
          </th>
          {#each grid.columns as column, index (column.key)}
            {@const count = grid.columnTotals[index] ?? 0}
            <td class="p-0">
              <button
                type="button"
                disabled={!ready}
                aria-pressed={filters.category === null && activeLabel === column.key}
                aria-label="All categories, {column.label}: {entryCount(count)}"
                onclick={() => onSelect({ category: null, label: column.key })}
                class="{buttonClass} {totalClass}"
              >
                <span aria-hidden="true">{count}</span>
              </button>
            </td>
          {/each}
          <td
            class="px-2 text-center text-sm font-semibold text-slate-800 tabular-nums dark:text-slate-100"
          >
            <span class="sr-only">All categories, all: </span>{grid.total}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>
