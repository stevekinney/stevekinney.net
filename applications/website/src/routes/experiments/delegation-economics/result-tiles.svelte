<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';

  import { formatCompactTokenCount as formatTokens, formatPrice } from '$lib/experiments/format';

  import {
    costText,
    formatMinutes,
    formatMultiplier,
    formatPercent,
    tokensText,
    wallClockText,
  } from './display';
  import type { EconomicsInputs, Evaluation } from './economics';
  import { teamMultiplierFor } from './economics';
  import type { WorkerModel } from './pricing';

  type Props = {
    evaluation: Evaluation;
    inputs: EconomicsInputs;
    model: WorkerModel;
  };

  const { evaluation, inputs, model }: Props = $props();

  const team = $derived(inputs.mode !== 'subagents');
  const solo = $derived(evaluation.workers === 1);

  // Each state lists its own colors. Appending warning colors to the plain ones
  // leaves the winner to the stylesheet's order, and the plain ones won.
  const tileBaseClasses = 'min-w-0 rounded-lg border p-4';
  const plainTileClasses = `${tileBaseClasses} border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900`;
  const warningTileClasses = `${tileBaseClasses} border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40`;
  const labelClasses = 'text-sm font-semibold text-slate-600 dark:text-slate-300';
  const valueClasses =
    'mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white';
  // The cost reason names the model, which an imported table or a shared link can set.
  const reasonBaseClasses = 'mt-2 text-sm [overflow-wrap:anywhere]';
  const reasonClasses = `${reasonBaseClasses} text-slate-600 dark:text-slate-300`;
  const warningReasonClasses = `${reasonBaseClasses} font-semibold text-amber-900 dark:text-amber-200`;

  const wallClockReason = $derived.by(() => {
    if (solo) return 'One worker is the solo session: nothing runs in parallel or gets integrated.';

    const ceiling = `${formatPercent(inputs.serialFraction)} of the work is serial, so ${evaluation.workers} workers top out at ${formatMultiplier(evaluation.idealSpeedup)}.`;
    const integration =
      evaluation.integration > 0
        ? ` Integrating ${evaluation.workers} reports adds ${formatMinutes(evaluation.integration)}.`
        : '';
    const assumed = team ? ' For a team this is assumed similar, not modelled.' : '';

    return `${ceiling}${integration}${assumed}`;
  });

  const tokensReason = $derived.by(() => {
    if (solo) return 'One worker reads everything once, the same as the solo session.';
    if (team) {
      return `A team runs about ${formatMultiplier(teamMultiplierFor(inputs))} the tokens of one session, per the course outline.`;
    }

    return `Each worker pays ${formatTokens(inputs.spawnTokens)} to spawn and reads the ${formatTokens(inputs.sharedTokens)} of shared context for itself, ${evaluation.workers} times over.`;
  });

  const costReason = $derived.by(() => {
    if (evaluation.slower) {
      return 'Warning: slower than one session, and you still pay for every worker.';
    }
    if (evaluation.warning && evaluation.costMultiplier !== null && evaluation.speedup !== null) {
      return `Warning: ${formatMultiplier(evaluation.costMultiplier)} the cost for a ${formatMultiplier(evaluation.speedup)} speedup.`;
    }

    const prices = `${model.name} at ${formatPrice(model.input)} input, ${formatPrice(model.cachedInput)} cached, and ${formatPrice(model.output)} output per million tokens.`;
    const cached =
      inputs.sharedPrefix && !team && !solo
        ? ` ${evaluation.workers - 1} workers read their spawn overhead from the cache.`
        : '';

    return `${prices}${cached}`;
  });
</script>

<div class="grid gap-4 md:grid-cols-3" data-testid="result-tiles">
  <section
    aria-labelledby="wall-clock-label"
    class={plainTileClasses}
    data-testid="wall-clock-tile"
  >
    <h3 id="wall-clock-label" class={labelClasses}>
      Wall-clock{team ? ' (assumed similar)' : ''}
    </h3>
    <p class={valueClasses}>{wallClockText(evaluation)}</p>
    <p class={reasonClasses}>{wallClockReason}</p>
  </section>

  <section aria-labelledby="tokens-label" class={plainTileClasses} data-testid="tokens-tile">
    <h3 id="tokens-label" class={labelClasses}>Tokens</h3>
    <p class={valueClasses}>{tokensText(evaluation)}</p>
    <p class={reasonClasses}>{tokensReason}</p>
  </section>

  <section
    aria-labelledby="cost-label"
    class={evaluation.warning ? warningTileClasses : plainTileClasses}
    data-testid="cost-tile"
    data-warning={evaluation.warning || undefined}
  >
    <h3 id="cost-label" class="{labelClasses} flex items-center gap-1.5">
      {#if evaluation.warning}
        <TriangleAlert aria-hidden="true" class="size-4 text-amber-700 dark:text-amber-400" />
      {/if}
      Cost
    </h3>
    <p class={valueClasses}>{costText(evaluation)}</p>
    <p class={evaluation.warning ? warningReasonClasses : reasonClasses}>{costReason}</p>
  </section>
</div>
