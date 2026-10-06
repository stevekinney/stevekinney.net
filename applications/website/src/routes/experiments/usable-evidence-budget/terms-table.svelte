<script lang="ts">
  import { compareScenarios, formatChange, formatPercent, formatTokens, percentOf } from './budget';
  import type { Scenario } from './budget';

  type Props = {
    scenario: Scenario;
    pinned: Scenario | null;
  };

  const { scenario, pinned }: Props = $props();

  const rows = $derived(compareScenarios(pinned ?? scenario, scenario));

  const numberCell = 'px-3 py-2 text-right whitespace-nowrap tabular-nums';
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
  tabindex="0"
  role="region"
  aria-label="Chart values as a table"
>
  <table class="w-full min-w-[30rem] border-collapse text-sm" data-testid="terms-table">
    <caption class="sr-only">
      Every figure in the chart with its share of the window.
      {#if pinned}The pinned scenario A is beside the current one, with the change between them.{/if}
    </caption>
    <thead>
      <tr
        class="border-b border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        <th scope="col" class="px-3 py-2 text-left font-semibold">Term</th>
        {#if pinned}
          <th scope="col" class="px-3 py-2 text-right font-semibold">A</th>
        {/if}
        <th scope="col" class="px-3 py-2 text-right font-semibold">
          {pinned ? 'Current' : 'Tokens'}
        </th>
        {#if pinned}
          <th scope="col" class="px-3 py-2 text-right font-semibold">Change</th>
        {/if}
        <th scope="col" class="px-3 py-2 text-right font-semibold">Share of the window</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.key)}
        <tr
          data-row={row.key}
          class="border-b border-slate-200 dark:border-slate-800 {row.key === 'usable'
            ? 'font-semibold text-slate-900 dark:text-white'
            : 'text-slate-700 dark:text-slate-200'}"
        >
          <th scope="row" class="px-3 py-2 text-left font-[inherit]">{row.name}</th>
          {#if pinned}
            <td class={numberCell} data-cell="pinned">{formatTokens(row.pinned)}</td>
          {/if}
          <td class={numberCell} data-cell="current">{formatTokens(row.current)}</td>
          {#if pinned}
            <td class={numberCell} data-cell="change">{formatChange(row.change)}</td>
          {/if}
          <td class={numberCell} data-cell="share">
            {formatPercent(percentOf(row.current, scenario.capacity))}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
