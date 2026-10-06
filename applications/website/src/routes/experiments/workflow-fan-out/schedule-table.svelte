<script lang="ts">
  import type { StrategyRun } from './run';
  import type { ScheduledAgent, Strategy } from './schedule';

  type Props = {
    runs: Record<Strategy, StrategyRun>;
    stageNames: string[];
  };

  const { runs, stageNames }: Props = $props();

  let open = $state(false);

  const minutes = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const time = (value: number | null): string => (value === null ? '—' : minutes.format(value));

  const results: Record<ScheduledAgent['status'], string> = {
    value: 'value',
    null: 'null',
    error: 'error',
    skipped: 'skipped',
    abandoned: 'abandoned',
    'not-started': 'not started',
  };

  const cell = 'px-3 py-1.5 text-right tabular-nums';
</script>

<details
  class="rounded-lg border border-slate-200 dark:border-slate-700"
  ontoggle={(event) => (open = event.currentTarget.open)}
>
  <summary
    class="focus-visible:outline-primary-600 cursor-pointer px-4 py-3 font-semibold text-slate-900 focus-visible:outline-2 dark:text-white"
  >
    The schedule as a table
  </summary>
  {#if open}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative max-h-[28rem] overflow-auto border-t border-slate-200 focus-visible:outline-2 dark:border-slate-700"
      role="region"
      aria-label="Schedule table"
      tabindex="0"
    >
      <table class="w-full text-sm text-slate-700 dark:text-slate-200">
        <caption class="sr-only">
          Start and end minutes for every agent under pipeline() and parallel(), and what it
          returned.
        </caption>
        <thead class="sticky top-0 bg-slate-50 dark:bg-slate-800">
          <tr>
            <th scope="col" class="px-3 py-2 text-left">Item</th>
            <th scope="col" class="px-3 py-2 text-left">Stage</th>
            <th scope="col" class="px-3 py-2 text-right">pipeline() start</th>
            <th scope="col" class="px-3 py-2 text-right">pipeline() end</th>
            <th scope="col" class="px-3 py-2 text-right">parallel() start</th>
            <th scope="col" class="px-3 py-2 text-right">parallel() end</th>
            <th scope="col" class="px-3 py-2 text-left">Result</th>
          </tr>
        </thead>
        <tbody>
          {#each runs.pipeline.schedule.agents as agent, index (index)}
            {@const other = runs.parallel.schedule.agents[index]}
            <tr class="border-t border-slate-100 dark:border-slate-800">
              <th scope="row" class="px-3 py-1.5 text-left font-normal tabular-nums"
                >{agent.item + 1}</th
              >
              <td class="px-3 py-1.5">{stageNames[agent.stage]}</td>
              <td class={cell}>{time(agent.start)}</td>
              <td class={cell}>{time(agent.end)}</td>
              <td class={cell}>{time(other.start)}</td>
              <td class={cell}>{time(other.end)}</td>
              <td class="px-3 py-1.5">
                {results[agent.status]}{other.status !== agent.status
                  ? ` (parallel(): ${results[other.status]})`
                  : ''}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</details>
