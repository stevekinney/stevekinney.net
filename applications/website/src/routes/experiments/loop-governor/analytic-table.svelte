<script lang="ts">
  import type { AnalyticRow } from './analytic';
  import { formatShare } from './labels';

  type Props = { rows: AnalyticRow[]; runs: number };

  const { rows, runs }: Props = $props();

  const show = (row: AnalyticRow, value: number): string =>
    row.kind === 'share' ? formatShare(value) : value.toFixed(3);
</script>

{#if rows.length > 0}
  <div class="relative overflow-x-auto">
    <table class="w-full text-sm" data-testid="analytic-table">
      <caption class="pb-2 text-left text-slate-600 dark:text-slate-300">
        Where a closed form exists, here it is beside the simulation. Raise the run count and watch
        them converge.
      </caption>
      <thead>
        <tr class="text-left text-slate-500 dark:text-slate-400">
          <th scope="col" class="py-1 pr-3 font-medium">Quantity</th>
          <th scope="col" class="py-1 pr-3 font-medium">Formula</th>
          <th scope="col" class="py-1 pr-3 text-right font-medium">Exact</th>
          <th scope="col" class="py-1 text-right font-medium">
            Simulated ({runs.toLocaleString('en-US')} runs)
          </th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr class="border-t border-slate-100 dark:border-slate-800" data-analytic={row.id}>
            <th
              scope="row"
              class="py-1.5 pr-3 text-left font-normal text-slate-800 dark:text-slate-100"
              >{row.label}</th
            >
            <td class="py-1.5 pr-3 font-mono text-xs text-slate-600 dark:text-slate-300"
              >{row.formula}</td
            >
            <td class="py-1.5 pr-3 text-right font-semibold tabular-nums">{show(row, row.exact)}</td
            >
            <td class="py-1.5 text-right tabular-nums">{show(row, row.simulated)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="text-sm text-slate-600 dark:text-slate-300">
    No closed form fits this configuration exactly, so the simulation is the answer. Closed forms
    appear with one progress iteration needed and no measurement errors.
  </p>
{/if}
