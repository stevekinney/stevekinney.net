<script lang="ts">
  import { formatCost, formatTokenCount } from '$lib/experiments/format';

  import type { Overview } from './analysis';
  import { formatPercent } from './compactions';

  type Props = { overview: Overview };

  const { overview }: Props = $props();

  const tileClasses =
    'rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
  const labelClasses = 'text-sm text-slate-600 dark:text-slate-300';
  const valueClasses =
    'block text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white';
  const noteClasses = 'mt-1 text-xs text-slate-500 dark:text-slate-400';

  const plural = (count: number, word: string): string =>
    `${formatTokenCount(count)} ${word}${count === 1 ? '' : 's'}`;
</script>

<dl class="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="overview-tiles">
  <div class={tileClasses}>
    <dt class={labelClasses}>Sessions</dt>
    <dd class={valueClasses} data-testid="tile-sessions">{formatTokenCount(overview.sessions)}</dd>
  </div>
  <div class={tileClasses}>
    <dt class={labelClasses}>Assistant turns</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-turns">{formatTokenCount(overview.turns)}</span>
      <p class={noteClasses}>
        After removing duplicate records. {plural(overview.subagentTurns, 'subagent turn')}.
      </p>
    </dd>
  </div>
  <div class={tileClasses}>
    <dt class={labelClasses}>Failed tool calls</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-failures">
        {formatTokenCount(overview.failures)}
      </span>
      <p class={noteClasses}>
        {formatPercent(overview.failureShare)} of {plural(overview.toolCalls, 'tool call')}
      </p>
    </dd>
  </div>
  <div class="{tileClasses} border-amber-400 dark:border-amber-600">
    <dt class={labelClasses}>Share that is floor</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-floor">{formatPercent(overview.floorShare)}</span
      >
      <p class={noteClasses}>
        {plural(overview.floorFailures, 'failure')} from the environment{overview.askFailures > 0
          ? `, plus ${formatTokenCount(overview.askFailures)} that could be either`
          : ''}
      </p>
    </dd>
  </div>
  <div class={tileClasses}>
    <dt class={labelClasses}>Estimated cost</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-cost">{formatCost(overview.cost)}</span>
      {#if overview.unpricedTurns > 0}
        <p class={noteClasses}>{plural(overview.unpricedTurns, 'unpriced turn')} not included</p>
      {/if}
    </dd>
  </div>
  <div class={tileClasses}>
    <dt class={labelClasses}>Cache hit ratio</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-cache">
        {formatPercent(overview.cacheHitRatio)}
      </span>
      <p class={noteClasses}>Cache reads over every prompt token</p>
    </dd>
  </div>
  <div class="{tileClasses} col-span-2">
    <dt class={labelClasses}>Compactions</dt>
    <dd>
      <span class={valueClasses} data-testid="tile-compactions">
        {formatTokenCount(
          overview.compactions.manual + overview.compactions.auto + overview.compactions.other,
        )}
      </span>
      <p class={noteClasses}>
        {formatTokenCount(overview.compactions.manual)} manual, {formatTokenCount(
          overview.compactions.auto,
        )} auto{overview.compactions.other > 0
          ? `, ${formatTokenCount(overview.compactions.other)} other`
          : ''}
      </p>
    </dd>
  </div>
</dl>
