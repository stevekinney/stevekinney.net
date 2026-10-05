<script lang="ts">
  import BarChart from './bar-chart.svelte';
  import { formatDefects, formatLines, plural } from './display';
  import { bodyClasses } from './field-styles';
  import { SWEEP_AGENTS } from './model';
  import type { SweepPoint } from './model';

  type Props = { points: readonly SweepPoint[]; sustainable: number | null; days: number };

  const { points, sustainable, days }: Props = $props();

  const categories = $derived(points.map((point) => String(point.agents)));
  const marker = $derived(
    sustainable !== null && sustainable >= 1 && sustainable <= SWEEP_AGENTS
      ? { index: sustainable - 1, label: `Sustainable: ${sustainable}` }
      : null,
  );
  const markerNote = $derived(
    sustainable === null
      ? 'Each agent opens nothing, so every count on this chart is sustainable.'
      : sustainable === 0
        ? 'You can’t keep even one agent fully reviewed at this rate, so there’s no line to draw.'
        : sustainable > SWEEP_AGENTS
          ? `You can keep ${sustainable} agents reviewed, which is past the right edge of this chart.`
          : `The dashed line marks ${sustainable} ${plural(sustainable, 'agent')}, the most you can keep fully reviewed.`,
  );
</script>

<div class="space-y-6">
  <p class={bodyClasses}>{markerNote} Past it, the backlog grows or the escapes do.</p>
  <div class="grid gap-6 md:grid-cols-2">
    <div class="min-w-0 space-y-1">
      <h3 class="font-semibold text-slate-800 dark:text-slate-100">
        Queue it: lines waiting after {days}
        {plural(days, 'day')}
      </h3>
      <BarChart
        label="Backlog after the last working day for 1 to 10 agents, when you queue it. Arrow keys move between agent counts. The table below has the same numbers."
        axisTitle="Agents"
        {categories}
        series={[
          {
            id: 'backlog',
            name: 'Lines waiting',
            values: points.map((point) => point.backlogLines),
            tone: 'primary',
          },
        ]}
        formatValue={(value) => `${formatLines(value)} lines`}
        describe={(index) => [
          `${points[index].backlogPrs} ${plural(points[index].backlogPrs, 'pull request')} waiting`,
        ]}
        {marker}
        testId="sweep-backlog-chart"
      />
    </div>
    <div class="min-w-0 space-y-1">
      <h3 class="font-semibold text-slate-800 dark:text-slate-100">
        Review it tired: escaped defects a day
      </h3>
      <BarChart
        label="Escaped defects per day for 1 to 10 agents, when you review it tired. Arrow keys move between agent counts. The table below has the same numbers."
        axisTitle="Agents"
        {categories}
        series={[
          {
            id: 'escaped',
            name: 'Escaped a day',
            values: points.map((point) => point.escapedPerDay),
            tone: 'rose',
            hatched: true,
          },
        ]}
        formatValue={formatDefects}
        {marker}
        testId="sweep-defects-chart"
      />
    </div>
  </div>

  <details class="space-y-2">
    <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
      The sweep as a table
    </summary>
    <div class="relative overflow-x-auto" role="region" aria-label="Sweep table" tabindex="-1">
      <table class="w-full min-w-[24rem] text-left text-sm tabular-nums">
        <thead class="text-slate-600 dark:text-slate-300">
          <tr>
            <th scope="col" class="py-1 pr-3">Agents</th>
            <th scope="col" class="py-1 pr-3">Lines waiting</th>
            <th scope="col" class="py-1 pr-3">Pull requests waiting</th>
            <th scope="col" class="py-1">Escaped a day, tired</th>
          </tr>
        </thead>
        <tbody class="text-slate-800 dark:text-slate-100">
          {#each points as point (point.agents)}
            <tr class="border-t border-slate-200 dark:border-slate-700">
              <th scope="row" class="py-1 pr-3 font-normal">
                {point.agents}{point.agents === sustainable ? ' (sustainable)' : ''}
              </th>
              <td class="py-1 pr-3">{formatLines(point.backlogLines)}</td>
              <td class="py-1 pr-3">{point.backlogPrs}</td>
              <td class="py-1">{formatDefects(point.escapedPerDay)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>
