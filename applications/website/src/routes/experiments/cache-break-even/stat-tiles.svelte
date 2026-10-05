<script lang="ts">
  import type { ChangeEvaluation } from './calculate';
  import { formatPlainDollars, formatSignedDollars, formatTokens } from './display';

  type Props = { evaluation: ChangeEvaluation };

  const { evaluation }: Props = $props();

  const ahead = $derived(evaluation.net >= -1e-9);
  const savings = $derived(evaluation.savingsPerMillion);
  const perMillion = $derived(
    `${savings < 0 ? '−' : ''}${formatPlainDollars(Math.abs(savings))} per MTok of output`,
  );
  const tileClasses = 'rounded-lg border p-4 space-y-1';
  const neutralClasses = 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
</script>

<section aria-label="The numbers" class="grid gap-3 sm:grid-cols-3">
  <div class="{tileClasses} {neutralClasses}">
    <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Cost to make the change</p>
    <p class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white" data-stat="cost">
      {formatPlainDollars(evaluation.cost)}
    </p>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      {#if evaluation.unchanged}
        nothing to re-cache
      {:else}
        re-cache {formatTokens(evaluation.contextTokens)} at {evaluation.to.name} input rate
      {/if}
    </p>
  </div>

  <div class="{tileClasses} {neutralClasses}">
    <p class="text-sm font-semibold text-slate-600 dark:text-slate-300">Value of remaining work</p>
    <p class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white" data-stat="value">
      {formatPlainDollars(evaluation.value)}
    </p>
    <p class="text-sm text-slate-600 dark:text-slate-300">{perMillion}</p>
  </div>

  {#if evaluation.unchanged}
    <div class="{tileClasses} {neutralClasses}">
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Net</p>
      <p class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white" data-stat="net">
        {formatSignedDollars(evaluation.net)}
      </p>
      <p class="text-sm text-slate-700 dark:text-slate-200" data-net-status>nothing is changing</p>
    </div>
  {:else}
    <div
      class="{tileClasses} {ahead
        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
        : 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/40'}"
    >
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Net</p>
      <p
        class="text-3xl font-bold tabular-nums {ahead
          ? 'text-emerald-800 dark:text-emerald-300'
          : 'text-rose-800 dark:text-rose-300'}"
        data-stat="net"
      >
        {formatSignedDollars(evaluation.net)}
      </p>
      <p class="text-sm text-slate-700 dark:text-slate-200" data-net-status>
        {ahead ? 'ahead' : 'behind'} if you change now
      </p>
    </div>
  {/if}
</section>
