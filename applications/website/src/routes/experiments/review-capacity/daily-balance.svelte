<script lang="ts">
  import { capacitySwatch, generatedSwatch, hatchSwatch, overflowSwatch } from './chart-tones';
  import { formatLines, plural } from './display';
  import { bodyClasses } from './field-styles';
  import type { DailyBalance, Scenario } from './model';

  type Props = { balance: DailyBalance; scenario: Scenario };

  const { balance, scenario }: Props = $props();

  const scale = $derived(Math.max(balance.generated, balance.capacity, 1));
  const percent = (value: number): string => `${(value / scale) * 100}%`;

  const gapText = $derived(
    balance.gap > 0
      ? `${formatLines(balance.gap)} lines a day you can’t review well`
      : balance.generated === 0
        ? 'No agents, so nothing to review'
        : balance.gap === 0
          ? 'Your sittings cover it exactly'
          : `Your sittings cover it, with ${formatLines(-balance.gap)} lines a day to spare`,
  );
</script>

<div class="space-y-6">
  <p class="text-2xl font-bold text-slate-900 dark:text-white" data-testid="verdict">
    {#if balance.sustainableAgents === null}
      Your agents open nothing, so you can keep any number of them reviewed.
    {:else}
      You can keep
      <span class="text-primary-700 dark:text-primary-300" data-testid="sustainable"
        >{balance.sustainableAgents}</span
      >
      {plural(balance.sustainableAgents, 'agent')} fully reviewed.
    {/if}
  </p>

  <figure class="space-y-2">
    <figcaption class="text-sm font-semibold text-slate-700 dark:text-slate-200">
      Lines a day: what {scenario.agents}
      {plural(scenario.agents, 'agent')} open, against what you can review well
    </figcaption>
    <div class="space-y-2" aria-hidden="true">
      <div class="flex h-9 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        <div class="flex h-full" style:width={percent(balance.generated)}>
          <div
            class="h-full {generatedSwatch}"
            style:width="{(Math.min(balance.generated, balance.capacity) /
              Math.max(balance.generated, 1)) *
              100}%"
          ></div>
          {#if balance.gap > 0}
            <div class="h-full flex-1 {overflowSwatch} {hatchSwatch}"></div>
          {/if}
        </div>
      </div>
      <div class="flex h-9 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        <div class="h-full {capacitySwatch}" style:width={percent(balance.capacity)}></div>
      </div>
    </div>
    <dl
      class="grid gap-x-6 gap-y-1 text-sm text-slate-700 tabular-nums sm:grid-cols-2 dark:text-slate-200"
    >
      <div class="flex gap-2">
        <dt>Generated:</dt>
        <dd data-testid="generated">{formatLines(balance.generated)} lines</dd>
      </div>
      <div class="flex gap-2">
        <dt>You can review well:</dt>
        <dd data-testid="capacity">{formatLines(balance.capacity)} lines</dd>
      </div>
    </dl>
    <p
      class="font-semibold {balance.gap > 0
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-slate-900 dark:text-white'}"
      data-testid="gap-label"
    >
      {gapText}
    </p>
    {#if balance.gap > 0}
      <p class={bodyClasses}>
        The striped end of the top bar is the gap. Each day it either waits for tomorrow, so the
        queue grows, or gets a tired review that catches less.
      </p>
    {:else if balance.oversizedPr}
      <p class={bodyClasses} data-testid="oversized-note">
        On average your sittings cover what the agents open, but one {formatLines(
          scenario.linesPerPr,
        )}-line pull request is more than a whole day of them. Split it.
      </p>
    {/if}
  </figure>
</div>
