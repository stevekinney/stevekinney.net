<script lang="ts">
  import { hatchSwatch, toneSwatch } from './chart-tones';
  import { formatLines, formatMinutes, formatSignedLines } from './display';
  import { bodyClasses } from './field-styles';
  import { WORKDAY_MINUTES } from './model';
  import type { DailyBalance } from './model';
  import type { Scenario } from './scenario';
  import { sustainableText } from './summary';

  type Props = { balance: DailyBalance; scenario: Scenario };

  const { balance, scenario }: Props = $props();

  const scale = $derived(Math.max(balance.generated, balance.capacity, 1));
  const percent = (value: number): string => `${(value / scale) * 100}%`;
  const freshShare = $derived(Math.min(balance.generated, balance.capacity));

  const tired = $derived(scenario.policy === 'tired');
  const segments = $derived([
    {
      id: 'review',
      name: 'Fresh review',
      minutes: balance.reviewMinutes,
      tone: 'primary' as const,
    },
    {
      id: 'follow-up',
      name: 'Follow-up',
      minutes: balance.followUpMinutes,
      tone: 'amber' as const,
    },
    ...(tired && balance.overflowMinutes > 0
      ? [
          {
            id: 'tired',
            name: 'Tired review',
            minutes: balance.overflowMinutes,
            tone: 'rose' as const,
          },
        ]
      : []),
  ]);
  const totalMinutes = $derived(segments.reduce((sum, segment) => sum + segment.minutes, 0));
  const minuteScale = $derived(Math.max(WORKDAY_MINUTES, totalMinutes));
  const gapText = $derived(
    balance.gap > 0
      ? `${formatSignedLines(balance.gap)} lines/day you won’t review fresh`
      : balance.generated === 0
        ? 'No agents, so nothing to review'
        : `Capacity covers it, with ${formatLines(-balance.gap)} lines/day to spare`,
  );
</script>

<div class="space-y-6">
  <dl class="grid gap-3 sm:grid-cols-3" data-testid="balance-tiles">
    <div class="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <dt class="text-sm text-slate-600 dark:text-slate-300">Generated each day</dt>
      <dd
        class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
        data-testid="generated"
      >
        {formatLines(balance.generated)} lines
      </dd>
    </div>
    <div class="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <dt class="text-sm text-slate-600 dark:text-slate-300">You can review well</dt>
      <dd
        class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
        data-testid="capacity"
      >
        {formatLines(balance.capacity)} lines
      </dd>
    </div>
    <div class="rounded-md border border-slate-200 p-3 dark:border-slate-700">
      <dt class="text-sm text-slate-600 dark:text-slate-300">Agents you can keep reviewed</dt>
      <dd
        class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
        data-testid="sustainable"
      >
        {balance.sustainableAgents ?? 'Any'}
      </dd>
    </div>
  </dl>

  <figure class="space-y-2">
    <figcaption class="text-sm font-semibold text-slate-700 dark:text-slate-200">
      Lines a day: generated on the left, capacity on the right
    </figcaption>
    <div class="grid grid-cols-2 gap-px" aria-hidden="true">
      <div class="flex h-9 justify-end overflow-hidden rounded-l-md bg-slate-100 dark:bg-slate-800">
        <div class="flex h-full" style:width={percent(balance.generated)}>
          {#if balance.gap > 0}
            <div
              class="h-full {toneSwatch.rose} {hatchSwatch}"
              style:width="{(balance.gap / Math.max(balance.generated, 1)) * 100}%"
            ></div>
          {/if}
          <div class="h-full flex-1 {toneSwatch.slate}"></div>
        </div>
      </div>
      <div class="flex h-9 overflow-hidden rounded-r-md bg-slate-100 dark:bg-slate-800">
        <div class="h-full {toneSwatch.primary}" style:width={percent(balance.capacity)}></div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 text-sm text-slate-700 tabular-nums dark:text-slate-200">
      <p class="text-right">Generated {formatLines(balance.generated)}</p>
      <p>Capacity {formatLines(balance.capacity)}</p>
    </div>
    <p
      class="font-semibold {balance.gap > 0
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-slate-900 dark:text-white'}"
      data-testid="gap-label"
    >
      {gapText}
    </p>
    <p class={bodyClasses}>
      {#if balance.gap > 0}
        The striped part of the left bar is the gap. You review {formatLines(freshShare)} lines fresh;
        the other {formatLines(balance.gap)}
        {scenario.policy === 'queue' ? 'wait for tomorrow' : 'get a tired review'}.
      {:else if balance.generated === 0}
        With no agents, the backlog stays at zero and nothing escapes review.
      {:else if balance.oversizedPr}
        On average your good sittings cover what the agents open, but a single pull request is
        bigger than a whole day of them, so it still waits or gets a tired review.
      {:else}
        Everything the agents open fits in your good sittings, so the backlog stays at zero and both
        policies give the same result.
      {/if}
      You can keep {sustainableText(balance.sustainableAgents)} fully reviewed.
    </p>
  </figure>

  {#if balance.oversizedPr}
    <p
      role="note"
      class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      data-testid="oversized-warning"
    >
      One {formatLines(scenario.linesPerPr)}-line pull request is more than a whole day of good
      sittings ({formatLines(balance.capacity)} lines). It queues across days, and it should be split.
      The helper below suggests how.
    </p>
  {/if}

  <figure class="space-y-2">
    <figcaption class="text-sm font-semibold text-slate-700 dark:text-slate-200">
      Minutes a day against an eight-hour day
    </figcaption>
    <div
      class="relative h-9 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
      aria-hidden="true"
    >
      <div class="flex h-full">
        {#each segments as segment (segment.id)}
          <div
            class="h-full {toneSwatch[segment.tone]} {segment.tone === 'rose' ? hatchSwatch : ''}"
            style:width="{(segment.minutes / minuteScale) * 100}%"
          ></div>
        {/each}
      </div>
      <div
        class="absolute top-0 h-full border-l-2 border-dashed border-slate-900 dark:border-white"
        style:left="calc({(WORKDAY_MINUTES / minuteScale) * 100}% - 2px)"
      ></div>
    </div>
    <ul
      class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 tabular-nums dark:text-slate-200"
      data-testid="minutes-legend"
    >
      {#each segments as segment (segment.id)}
        <li class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="inline-block h-3 w-5 rounded-sm {toneSwatch[segment.tone]} {segment.tone ===
            'rose'
              ? hatchSwatch
              : ''}"
          ></span>
          {segment.name}: {formatMinutes(segment.minutes)} minutes
        </li>
      {/each}
      <li>Eight-hour day (dashed line): {WORKDAY_MINUTES} minutes</li>
    </ul>
    <p class={bodyClasses}>
      Review and follow-up take {formatMinutes(totalMinutes)} of your {WORKDAY_MINUTES} minutes{totalMinutes >
      WORKDAY_MINUTES
        ? ', which is more than the whole day'
        : ''}. Follow-up is {scenario.agents} × {scenario.prsPerAgent} pull requests × {scenario.followUpShare}%
      × {scenario.followUpMinutes} minutes.
    </p>
  </figure>
</div>
