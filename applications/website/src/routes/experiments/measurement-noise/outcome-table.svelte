<script lang="ts">
  import { formatDifference, formatOutcomeInterval, formatValue } from './outcomes';
  import type { OutcomeRow } from './outcomes';

  type Props = {
    rows: OutcomeRow[];
    labels: string[];
  };

  const { rows, labels }: Props = $props();

  const labelA = $derived(labels[0] ?? 'A');
  const labelB = $derived(labels[1] ?? 'B');
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative overflow-x-auto focus-visible:outline-2"
  role="region"
  aria-label="Outcome table"
  tabindex="0"
>
  <table class="w-full min-w-[40rem] text-left text-sm" data-testid="outcome-table">
    <caption class="sr-only">
      Each outcome under {labelA} and {labelB}, the difference, and its 95% interval. Rows the data
      has no column for are greyed out.
    </caption>
    <thead>
      <tr
        class="border-b border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
      >
        <th scope="col" class="py-2 pr-3 font-semibold">Outcome</th>
        <th scope="col" class="px-3 py-2 font-semibold [overflow-wrap:anywhere]">{labelA}</th>
        <th scope="col" class="px-3 py-2 font-semibold [overflow-wrap:anywhere]">{labelB}</th>
        <th scope="col" class="px-3 py-2 font-semibold">Difference (A − B)</th>
        <th scope="col" class="px-3 py-2 font-semibold">95% interval</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr
          data-row={row.id}
          data-available={row.available}
          class="border-b border-slate-100 align-top dark:border-slate-800 {row.available
            ? 'text-slate-900 dark:text-slate-100'
            : 'text-slate-400 dark:text-slate-500'}"
        >
          <th scope="row" class="py-2 pr-3 font-medium">
            {row.label}
            <span class="block text-xs font-normal text-slate-500 dark:text-slate-400"
              >{row.note}</span
            >
          </th>
          <td class="px-3 py-2 tabular-nums">
            {formatValue(row, row.a)}
            {#if row.aDetail}<span class="block text-xs text-slate-500 dark:text-slate-400"
                >{row.aDetail}</span
              >{/if}
          </td>
          <td class="px-3 py-2 tabular-nums">
            {formatValue(row, row.b)}
            {#if row.bDetail}<span class="block text-xs text-slate-500 dark:text-slate-400"
                >{row.bDetail}</span
              >{/if}
          </td>
          <td class="px-3 py-2 tabular-nums" data-cell="difference">{formatDifference(row)}</td>
          <td
            class="px-3 py-2 tabular-nums {row.intervalNote
              ? 'min-w-[14rem] text-xs text-slate-600 dark:text-slate-300'
              : 'whitespace-nowrap'}"
            data-cell="interval">{formatOutcomeInterval(row)}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</div>
