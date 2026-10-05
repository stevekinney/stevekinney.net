<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import BarChart from './bar-chart.svelte';
  import type { Bar } from './bar-chart.svelte';
  import { categoryStyle } from './category-styles';
  import { toCsv } from './digest';
  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    headCellClasses,
    tableClasses,
    tableRegionClasses,
  } from './field-styles';
  import type { DayBucket } from './timeline';

  type Props = { timeline: DayBucket[]; categories: string[] };

  const { timeline, categories }: Props = $props();

  const present = $derived(
    categories.filter((category) => timeline.some((day) => (day.counts[category] ?? 0) > 0)),
  );

  const bars = $derived<Bar[]>(
    timeline.map((day) => ({
      id: day.day,
      label: day.day.slice(5),
      note: `${formatTokenCount(day.total)} failure${day.total === 1 ? '' : 's'} on ${day.day}`,
      segments: present.map((category) => ({
        key: category,
        label: category,
        value: day.counts[category] ?? 0,
        fill: categoryStyle(category, categories).fill,
      })),
    })),
  );

  const exportCsv = (): void =>
    downloadText(
      'failures-per-day.csv',
      toCsv(
        ['Day', ...present, 'Total'],
        timeline.map((day) => [
          day.day,
          ...present.map((category) => day.counts[category] ?? 0),
          day.total,
        ]),
      ),
      'text/csv',
    );
</script>

{#if timeline.length === 0}
  <p class={bodyClasses}>No failures with a time to plot.</p>
{:else}
  <div class="space-y-3">
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
      {#each present as category (category)}
        <li class="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            class="inline-block size-2.5 rounded-sm {categoryStyle(category, categories).swatch}"
          ></span>
          {category}
        </li>
      {/each}
    </ul>
    <BarChart
      {bars}
      testId="timeline-chart"
      label="Failures per day, stacked by category. The failures per day table below has the same numbers."
      formatValue={(value) => formatTokenCount(Math.round(value))}
    />
    <details>
      <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
        Failures per day as a table
      </summary>
      <div class="mt-3 space-y-2">
        <button type="button" class={buttonClasses} onclick={exportCsv}>Download as CSV</button>
        <div
          class="{tableRegionClasses} max-h-96"
          role="region"
          aria-label="Failures per day table"
          tabindex="-1"
        >
          <table class={tableClasses}>
            <thead>
              <tr>
                <th scope="col" class={headCellClasses}>Day</th>
                {#each present as category (category)}
                  <th scope="col" class="{headCellClasses} text-right">{category}</th>
                {/each}
                <th scope="col" class="{headCellClasses} text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {#each timeline as day (day.day)}
                <tr>
                  <th scope="row" class="{cellClasses} font-normal">{day.day}</th>
                  {#each present as category (category)}
                    <td class="{cellClasses} text-right">{day.counts[category] ?? 0}</td>
                  {/each}
                  <td class="{cellClasses} text-right font-semibold">{day.total}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  </div>
{/if}
