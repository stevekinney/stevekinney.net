<script lang="ts">
  import { formatCost, formatTokenCount } from '$lib/experiments/format';

  import BarChart from './bar-chart.svelte';
  import { formatPercent } from './compactions';
  import { costHistogram, costliestSessions } from './cost';
  import type { CostSummary } from './cost';
  import { toCsv } from './digest';
  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    headCellClasses,
    tableClasses,
    tableRegionClasses,
    wrapAnywhere,
  } from './field-styles';
  import { dayOf } from './timeline';

  type Props = { cost: CostSummary };

  const { cost }: Props = $props();

  const subheadingClasses = 'text-lg font-bold text-slate-900 dark:text-white';
  const histogram = $derived(costHistogram(cost.sessions.map((session) => session.cost)));
  const costliest = $derived(costliestSessions(cost.sessions, 10));
  const bracket = (from: number, to: number): string => `${formatCost(from)}–${formatCost(to)}`;

  const exportSessions = (): void =>
    downloadText(
      'session-costs.csv',
      toCsv(
        [
          'Session',
          'Start',
          'Working directory',
          'Branch',
          'Cost (USD)',
          'Turns',
          'Unpriced turns',
        ],
        [...cost.sessions]
          .sort((first, second) => second.cost - first.cost)
          .map((session) => [
            session.sessionId,
            session.start,
            session.cwd,
            session.gitBranch,
            session.cost.toFixed(4),
            session.turns,
            session.unpricedTurns,
          ]),
      ),
      'text/csv',
    );
</script>

<div class="space-y-8">
  {#if cost.unpricedModels.length > 0 || cost.assumedFiveMinuteTurns > 0}
    <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200">
      {#if cost.unpricedModels.length > 0}
        <li>
          Unpriced, and left out of every dollar figure:
          {#each cost.unpricedModels as model, index (model)}<code class={wrapAnywhere}
              >{model}</code
            >{index < cost.unpricedModels.length - 1 ? ', ' : ''}{/each}. No row in the price table
          matches its family and version, so it isn’t guessed.
        </li>
      {/if}
      {#if cost.assumedFiveMinuteTurns > 0}
        <li>
          {formatTokenCount(cost.assumedFiveMinuteTurns)} turn{cost.assumedFiveMinuteTurns === 1
            ? ''
            : 's'}
          wrote to the cache without saying for how long, so those writes are billed at the five-minute
          rate.
        </li>
      {/if}
    </ul>
  {/if}

  <section aria-labelledby="histogram-heading" class="space-y-3">
    <h3 id="histogram-heading" class={subheadingClasses}>Cost per session</h3>
    {#if histogram.length === 0}
      <p class={bodyClasses}>No priced sessions.</p>
    {:else}
      <BarChart
        testId="cost-histogram"
        integer
        label="Sessions per cost bracket. The table below has the same numbers."
        bars={histogram.map((bin) => ({
          id: String(bin.from).padStart(12, '0'),
          label: formatCost(bin.from),
          note: bracket(bin.from, bin.to),
          segments: [
            {
              key: 'sessions',
              label: 'Sessions',
              value: bin.count,
              fill: 'fill-primary-600 dark:fill-primary-400',
            },
          ],
        }))}
      />
      <div
        class={tableRegionClasses}
        role="region"
        aria-label="Cost per session table"
        tabindex="-1"
      >
        <table class={tableClasses}>
          <thead>
            <tr>
              <th scope="col" class={headCellClasses}>Cost bracket</th>
              <th scope="col" class="{headCellClasses} text-right">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {#each histogram as bin (bin.from)}
              <tr>
                <th scope="row" class="{cellClasses} font-normal">{bracket(bin.from, bin.to)}</th>
                <td class="{cellClasses} text-right">{bin.count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <section aria-labelledby="by-model-heading" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 id="by-model-heading" class={subheadingClasses}>Cost by model</h3>
      <button
        type="button"
        class={buttonClasses}
        onclick={() =>
          downloadText(
            'cost-by-model.csv',
            toCsv(
              ['Model', 'Priced as', 'Turns', 'Cost (USD)'],
              cost.byModel.map((row) => [
                row.model,
                row.priceName ?? 'unpriced',
                row.turns,
                row.cost === null ? null : row.cost.toFixed(4),
              ]),
            ),
            'text/csv',
          )}
      >
        Download as CSV
      </button>
    </div>
    <div class={tableRegionClasses} role="region" aria-label="Cost by model table" tabindex="-1">
      <table class={tableClasses} data-testid="cost-by-model">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Model</th>
            <th scope="col" class={headCellClasses}>Priced as</th>
            <th scope="col" class="{headCellClasses} text-right">Turns</th>
            <th scope="col" class="{headCellClasses} text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {#each cost.byModel as row (row.model)}
            <tr>
              <th scope="row" class="{cellClasses} max-w-60 font-normal whitespace-normal">
                <code class={wrapAnywhere}>{row.model}</code>
              </th>
              <td class={cellClasses}>{row.priceName ?? 'unpriced'}</td>
              <td class="{cellClasses} text-right">{formatTokenCount(row.turns)}</td>
              <td class="{cellClasses} text-right"
                >{row.cost === null ? 'unpriced' : formatCost(row.cost)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section aria-labelledby="cache-heading" class="space-y-3">
    <h3 id="cache-heading" class={subheadingClasses}>Cache hit ratio over time</h3>
    <p class={bodyClasses}>
      Cache reads over every prompt token, per day: {formatTokenCount(cost.cacheReadTokens)} read, {formatTokenCount(
        cost.inputTokens,
      )} uncached, {formatTokenCount(cost.cacheWriteTokens)} written overall.
    </p>
    {#if cost.cacheByDay.length > 0}
      <BarChart
        testId="cache-chart"
        maximum={1}
        formatValue={(value) => formatPercent(value)}
        label="Cache hit ratio per day. The table below has the same numbers."
        bars={cost.cacheByDay.map((day) => ({
          id: day.day,
          label: day.day.slice(5),
          note: `${formatTokenCount(day.promptTokens)} prompt tokens`,
          segments: [
            {
              key: 'ratio',
              label: 'Cache hit ratio',
              value: day.ratio ?? 0,
              fill: 'fill-emerald-600 dark:fill-emerald-400',
            },
          ],
        }))}
      />
      <details>
        <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
          Cache hit ratio per day as a table
        </summary>
        <div
          class="{tableRegionClasses} mt-3 max-h-80"
          role="region"
          aria-label="Cache hit ratio table"
          tabindex="-1"
        >
          <table class={tableClasses}>
            <thead>
              <tr>
                <th scope="col" class={headCellClasses}>Day</th>
                <th scope="col" class="{headCellClasses} text-right">Cache hit ratio</th>
                <th scope="col" class="{headCellClasses} text-right">Prompt tokens</th>
              </tr>
            </thead>
            <tbody>
              {#each cost.cacheByDay as day (day.day)}
                <tr>
                  <th scope="row" class="{cellClasses} font-normal">{day.day}</th>
                  <td class="{cellClasses} text-right">{formatPercent(day.ratio)}</td>
                  <td class="{cellClasses} text-right">{formatTokenCount(day.promptTokens)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </details>
    {/if}
  </section>

  <section aria-labelledby="costliest-heading" class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 id="costliest-heading" class={subheadingClasses}>Costliest sessions</h3>
      <button type="button" class={buttonClasses} onclick={exportSessions}>
        Download every session as CSV
      </button>
    </div>
    <div
      class={tableRegionClasses}
      role="region"
      aria-label="Costliest sessions table"
      tabindex="-1"
    >
      <table class={tableClasses} data-testid="costliest-sessions">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Started</th>
            <th scope="col" class={headCellClasses}>Working directory</th>
            <th scope="col" class={headCellClasses}>Branch</th>
            <th scope="col" class="{headCellClasses} text-right">Cost</th>
            <th scope="col" class="{headCellClasses} text-right">Turns</th>
          </tr>
        </thead>
        <tbody>
          {#each costliest as session (session.sessionId)}
            <tr>
              <th scope="row" class="{cellClasses} font-normal whitespace-nowrap">
                {session.start ? `${dayOf(session.start)} ${session.start.slice(11, 16)}` : '—'}
              </th>
              <td class="{cellClasses} max-w-60 whitespace-normal"
                ><span class={wrapAnywhere}>{session.cwd ?? '—'}</span></td
              >
              <td class="{cellClasses} max-w-40 whitespace-normal"
                ><span class={wrapAnywhere}>{session.gitBranch ?? '—'}</span></td
              >
              <td class="{cellClasses} text-right font-semibold">{formatCost(session.cost)}</td>
              <td class="{cellClasses} text-right">{formatTokenCount(session.turns)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</div>
