<script lang="ts">
  import { formatCompactTokenCount as formatTokens, formatCost } from '$lib/experiments/format';

  import type { Projection } from './projection';

  type Props = {
    projection: Projection;
    turns: number;
    warm: boolean;
    baseline: number;
    contextNow: number;
    laterAfter: number | null;
  };

  const { projection, turns, warm, baseline, contextNow, laterAfter }: Props = $props();

  const turnWord = (count: number): string => (count === 1 ? 'turn' : 'turns');

  const tileClasses =
    'rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900';
  const valueClasses =
    'text-3xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white';
  const textClasses = 'text-slate-700 dark:text-slate-200';
  const noteClasses = 'mt-2 text-sm text-slate-600 dark:text-slate-300';

  const compactTurn = $derived(projection.compactCrossover);
  const clearTurn = $derived(projection.clearCrossover);
  const laterTurn = $derived(projection.laterCrossover);
  const laterJump = $derived(
    projection.later && laterAfter !== null
      ? projection.later[laterAfter] - projection.keep[laterAfter]
      : null,
  );
</script>

<div class="grid gap-4 md:grid-cols-3" data-testid="hero-tiles">
  <section
    aria-labelledby="lead-tile"
    class="{tileClasses} border-primary-300 dark:border-primary-700"
  >
    <p id="lead-tile" class={textClasses}>
      {#if projection.compactCannotPay}
        Compaction never pays for itself
      {:else if compactTurn === null}
        Compaction doesn’t pay for itself
      {:else if compactTurn === 0}
        Compaction is cheaper
      {:else}
        Compaction pays for itself after
      {/if}
      {#if compactTurn !== null && !projection.compactCannotPay}
        <strong class="block {valueClasses}">
          {compactTurn === 0 ? 'right away' : `${compactTurn} ${turnWord(compactTurn)}`}
        </strong>
      {:else}
        <strong class="block {valueClasses}">—</strong>
      {/if}
    </p>
    {#if projection.compactCannotPay}
      <p class={noteClasses}>
        The summary plus the {formatTokens(baseline)} baseline comes to
        {formatTokens(baseline + projection.summaryTokens)} tokens, no smaller than your {formatTokens(
          contextNow,
        )} of context. The compacted prefix isn’t any cheaper to re-read, so there’s nothing to pay back.
      </p>
    {:else if compactTurn === null}
      <p class={noteClasses}>Not within {turns} {turnWord(turns)} at this scenario.</p>
    {/if}
  </section>

  <section aria-labelledby="compact-tile" class={tileClasses}>
    <p id="compact-tile" class={textClasses}>
      Compacting costs
      <strong class="block {valueClasses}">{formatCost(projection.parts.total)}</strong>
      up front, on a {warm ? 'warm' : 'cold'} cache
    </p>
  </section>

  <section aria-labelledby="clear-tile" class={tileClasses}>
    <p id="clear-tile" class={textClasses}>
      Clearing costs
      <strong class="block {valueClasses}">{formatCost(projection.clearOneTime)}</strong>
      up front, and loses everything you don’t re-read
    </p>
    <p class={noteClasses}>
      {#if clearTurn === null}
        Clearing doesn’t pay for itself within {turns}
        {turnWord(turns)}.
      {:else if clearTurn === 0}
        Clearing is cheaper right away.
      {:else}
        Clearing pays for itself after {clearTurn}
        {turnWord(clearTurn)}.
      {/if}
    </p>
  </section>
</div>

{#if laterAfter !== null && laterJump !== null}
  <section aria-labelledby="later-tile" class="{tileClasses} mt-4">
    <p id="later-tile" class={textClasses}>
      Compacting after {laterAfter}
      {turnWord(laterAfter)}
      {#if laterTurn === null}
        doesn’t pay for itself within {turns}
        {turnWord(turns)}
        <strong class="block {valueClasses}">—</strong>
      {:else}
        pays for itself after
        <strong class="block {valueClasses}">{laterTurn} {turnWord(laterTurn)}</strong>
      {/if}
    </p>
    <p class={noteClasses}>
      Waiting costs {formatCost(laterJump)} when you do compact, because the context has grown. Compare
      it with {formatCost(projection.parts.total)} now.
    </p>
  </section>
{/if}
