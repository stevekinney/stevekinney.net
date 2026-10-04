<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import { bestAt, tableTurns } from './projection';
  import type { Projection, StrategyId } from './projection';
  import { strategyStyles } from './strategy-styles';

  type Props = {
    projection: Projection;
    turns: number;
    pinnedTurn: number | null;
    onPin: (turn: number | null) => void;
  };

  const { projection, turns, pinnedTurn, onPin }: Props = $props();

  const columns = $derived<StrategyId[]>(
    projection.later ? ['keep', 'compact', 'clear', 'later'] : ['keep', 'compact', 'clear'],
  );

  // A pinned turn that isn't one of the usual rows gets a temporary row in its place.
  const rows = $derived.by(() => {
    const usual = tableTurns(turns);
    const all =
      pinnedTurn !== null && !usual.includes(pinnedTurn)
        ? [...usual, pinnedTurn].sort((first, second) => first - second)
        : usual;

    return all.map((turn) => ({
      turn,
      pinned: turn === pinnedTurn,
      temporary: turn === pinnedTurn && !usual.includes(turn),
      best: bestAt(projection, turn),
    }));
  });

  const cell = 'px-3 py-2 text-right whitespace-nowrap tabular-nums';
  const heading = 'px-3 py-2 text-right font-semibold whitespace-nowrap';
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
  tabindex="0"
  role="region"
  aria-label="Projected spend table"
>
  <table class="w-full border-collapse text-sm" data-testid="projection-table">
    <caption class="sr-only">
      Cumulative spend in dollars at selected turns, with the cheapest strategy at each.
    </caption>
    <thead class="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <tr>
        <th scope="col" class="px-3 py-2 text-left font-semibold">Turn</th>
        {#each columns as column (column)}
          <th scope="col" class={heading}>{strategyStyles[column].name}</th>
        {/each}
        <th scope="col" class="px-3 py-2 text-left font-semibold">Best</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
      {#each rows as row (row.turn)}
        <tr
          class={row.pinned ? 'bg-primary-50 dark:bg-primary-950/50' : 'bg-white dark:bg-slate-900'}
          data-pinned={row.pinned || undefined}
        >
          <th
            scope="row"
            class="px-3 py-2 text-left font-semibold whitespace-nowrap text-slate-900 tabular-nums dark:text-white"
          >
            {row.turn}
            {#if row.pinned}
              <span class="text-primary-700 dark:text-primary-300 ml-1 text-xs font-medium">
                pinned{row.temporary ? ', temporary row' : ''}
              </span>
              <button
                type="button"
                onclick={() => onPin(null)}
                aria-label="Unpin turn {row.turn}"
                class="focus-visible:outline-primary-600 ml-1 cursor-pointer rounded px-1 text-xs text-slate-600 underline focus-visible:outline-2 dark:text-slate-300"
              >
                unpin
              </button>
            {/if}
          </th>
          {#each columns as column (column)}
            {@const series = projection[column]}
            <td class="{cell} text-slate-800 dark:text-slate-100">
              {series ? formatCost(series[row.turn]) : ''}
            </td>
          {/each}
          <td class="px-3 py-2 text-left whitespace-nowrap">
            <span class="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <span
                aria-hidden="true"
                class="inline-block size-2.5 rounded-full {strategyStyles[row.best].swatch}"
              ></span>
              {strategyStyles[row.best].name}
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
