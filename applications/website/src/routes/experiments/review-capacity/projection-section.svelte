<script lang="ts">
  import BarChart from './bar-chart.svelte';
  import type { BarSeries } from './bar-chart.svelte';
  import { formatDefects, formatLines, plural } from './display';
  import { bodyClasses } from './field-styles';
  import type { Simulation } from './model';
  import type { OverflowPolicy, Scenario } from './scenario';
  import { oldestText } from './summary';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    scenario: Scenario;
    queued: Simulation;
    tired: Simulation;
    allFreshPerDay: number;
    ready: boolean;
    onPolicy: (policy: OverflowPolicy) => void;
  };

  const { scenario, queued, tired, allFreshPerDay, ready, onPolicy }: Props = $props();

  const days = $derived(queued.days.map((day) => String(day.day)));
  const lastQueued = $derived(queued.days.at(-1));
  const peakQueued = $derived(
    queued.days.reduce<(typeof queued.days)[number] | undefined>(
      (peak, day) => (peak && peak.backlogLines >= day.backlogLines ? peak : day),
      undefined,
    ),
  );
  const tiredPerDay = $derived(tired.totals.escaped.total / scenario.days);

  const backlogSeries = $derived<BarSeries[]>([
    {
      id: 'backlog',
      name: 'Lines waiting',
      values: queued.days.map((day) => day.backlogLines),
      tone: 'primary',
    },
  ]);
  const defectSeries = $derived<BarSeries[]>([
    {
      id: 'fresh',
      name: 'Escaped after fresh review',
      values: tired.days.map((day) => day.cumulativeEscaped.fresh),
      tone: 'slate',
    },
    {
      id: 'fatigued',
      name: 'Escaped after tired review',
      values: tired.days.map((day) => day.cumulativeEscaped.fatigued),
      tone: 'rose',
      hatched: true,
    },
  ]);

  const describeQueue = (index: number): string[] => {
    const day = queued.days[index];

    return [
      `${day.backlogPrs} ${plural(day.backlogPrs, 'pull request')} waiting`,
      `Oldest: ${oldestText(day)}`,
    ];
  };

  const describeTired = (index: number): string[] => [
    `${formatDefects(tired.days[index].cumulativeEscaped.total)} escaped in all`,
  ];

  const policies: { value: OverflowPolicy; label: string }[] = [
    { value: 'queue', label: 'Queue it' },
    { value: 'tired', label: 'Review it tired' },
  ];
</script>

<div class="space-y-6">
  <div class="max-w-md">
    <ToggleGroup
      id="projection-policy"
      label="Show the projection for"
      value={scenario.policy}
      options={policies}
      disabled={!ready}
      onChange={onPolicy}
    />
  </div>

  {#if scenario.policy === 'queue'}
    <div class="space-y-3" data-testid="queue-projection">
      <p class="text-slate-800 dark:text-slate-100" data-testid="queue-headline">
        {#if lastQueued && lastQueued.backlogLines > 0}
          After {scenario.days} working {plural(scenario.days, 'day')},
          <strong>{formatLines(lastQueued.backlogLines)} lines</strong> are waiting, which is
          <strong>{lastQueued.backlogPrs} {plural(lastQueued.backlogPrs, 'pull request')}</strong>.
          The oldest was {oldestText(lastQueued)}.
        {:else if peakQueued && peakQueued.backlogLines > 0}
          After {scenario.days} working {plural(scenario.days, 'day')}, nothing is waiting, but the
          backlog peaked at <strong>{formatLines(peakQueued.backlogLines)} lines</strong> on day {peakQueued.day},
          because one pull request is more than a day of good sittings.
        {:else}
          The backlog stays at zero. Everything opened is reviewed fresh the same day.
        {/if}
      </p>
      <BarChart
        label="Backlog at the end of each working day, in lines. Arrow keys move between days. The table below has the same numbers."
        axisTitle="Day"
        categories={days}
        series={backlogSeries}
        formatValue={(value) => `${formatLines(value)} lines`}
        describe={describeQueue}
        testId="projection-chart"
      />
    </div>
  {:else}
    <div class="space-y-3" data-testid="tired-projection">
      <p class="text-slate-800 dark:text-slate-100" data-testid="tired-headline">
        Reviewing everything the same day lets
        <strong>{formatDefects(tiredPerDay)} defects a day</strong> escape, against
        {formatDefects(allFreshPerDay)} if every line had been reviewed fresh. Over {scenario.days} working
        {plural(scenario.days, 'day')}, that’s {formatDefects(tired.totals.escaped.total)} in all,
        {formatDefects(tired.totals.escaped.fatigued)} of them from tired review.
      </p>
      <BarChart
        label="Cumulative escaped defects by working day, split into fresh and tired review. Arrow keys move between days. The table below has the same numbers."
        axisTitle="Day"
        categories={days}
        series={defectSeries}
        formatValue={formatDefects}
        describe={describeTired}
        testId="projection-chart"
      />
    </div>
  {/if}

  <div class="space-y-3">
    <h3 class="text-lg font-bold text-slate-900 dark:text-white">Both policies, side by side</h3>
    <p class={bodyClasses}>
      Over capacity, you pick one of these. The arithmetic doesn’t go away. Escaped defects per
      1,000 lines you review: {formatDefects(queued.totals.escapedPerThousandReviewed)} when you queue,
      {formatDefects(tired.totals.escapedPerThousandReviewed)} when you review tired{scenario.fatiguedFactor ===
      1
        ? ', the same, because a fatigued factor of 1 means no fatigue'
        : ''}.
    </p>
    <div class="grid gap-6 md:grid-cols-2" data-testid="small-multiples">
      <div class="min-w-0 space-y-1">
        <h4 class="font-semibold text-slate-800 dark:text-slate-100">Queue it: lines waiting</h4>
        <BarChart
          label="Queue it: lines waiting at the end of each day. The table below has the numbers."
          axisTitle="Day"
          categories={days}
          series={backlogSeries}
          formatValue={formatLines}
          interactive={false}
          height={180}
        />
      </div>
      <div class="min-w-0 space-y-1">
        <h4 class="font-semibold text-slate-800 dark:text-slate-100">
          Review it tired: escaped defects
        </h4>
        <BarChart
          label="Review it tired: cumulative escaped defects by day. The table below has the numbers."
          axisTitle="Day"
          categories={days}
          series={defectSeries}
          formatValue={formatDefects}
          interactive={false}
          height={180}
        />
      </div>
    </div>
  </div>

  <details class="space-y-2">
    <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
      The projection as a table
    </summary>
    <div class="relative overflow-x-auto" role="region" aria-label="Projection table" tabindex="-1">
      <table
        class="w-full min-w-[36rem] text-left text-sm tabular-nums"
        data-testid="projection-table"
      >
        <thead class="text-slate-600 dark:text-slate-300">
          <tr>
            <th scope="col" class="py-1 pr-3">Day</th>
            <th scope="col" class="py-1 pr-3">Lines waiting</th>
            <th scope="col" class="py-1 pr-3">Pull requests waiting</th>
            <th scope="col" class="py-1 pr-3">Oldest waiting</th>
            <th scope="col" class="py-1 pr-3">Tired: escaped, fresh</th>
            <th scope="col" class="py-1">Tired: escaped, fatigued</th>
          </tr>
        </thead>
        <tbody class="text-slate-800 dark:text-slate-100">
          {#each queued.days as day, index (day.day)}
            <tr class="border-t border-slate-200 dark:border-slate-700">
              <th scope="row" class="py-1 pr-3 font-normal">{day.day}</th>
              <td class="py-1 pr-3">{formatLines(day.backlogLines)}</td>
              <td class="py-1 pr-3">{day.backlogPrs}</td>
              <td class="py-1 pr-3">{oldestText(day)}</td>
              <td class="py-1 pr-3">{formatDefects(tired.days[index].cumulativeEscaped.fresh)}</td>
              <td class="py-1">{formatDefects(tired.days[index].cumulativeEscaped.fatigued)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>
