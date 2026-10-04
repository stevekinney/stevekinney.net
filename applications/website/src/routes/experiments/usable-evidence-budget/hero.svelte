<script lang="ts">
  import {
    biggestTerm,
    drawn,
    findTerm,
    formatChange,
    formatPercent,
    formatTokens,
    percentOf,
    usable,
    usableChange,
  } from './budget';
  import type { Scenario } from './budget';
  import type { EvidenceSummary } from './fit-check';

  type Props = {
    scenario: Scenario;
    pinned: Scenario | null;
    /** Null until a file has been added. */
    evidence: EvidenceSummary | null;
    charactersPerToken: number;
  };

  const { scenario, pinned, evidence, charactersPerToken }: Props = $props();

  const left = $derived(usable(scenario));
  const over = $derived(left <= 0);
  const biggest = $derived(biggestTerm(scenario));
  const change = $derived(pinned ? usableChange(pinned, scenario) : 0);
</script>

<section
  aria-labelledby="hero-label"
  data-over={over || undefined}
  class="flex flex-wrap items-start gap-4 rounded-lg border p-5 sm:p-6 {over
    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}"
>
  <span
    aria-hidden="true"
    class="mt-1.5 h-12 w-3 flex-none rounded-full {over
      ? 'bg-red-600 dark:bg-red-400'
      : 'bg-primary-700 dark:bg-primary-300'}"
  ></span>
  <div class="min-w-0 flex-1 space-y-2">
    <p
      id="hero-label"
      class="text-sm font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-300"
    >
      Usable evidence budget
    </p>
    <p
      class="text-5xl font-bold tracking-tight tabular-nums sm:text-6xl {over
        ? 'text-red-700 dark:text-red-400'
        : 'text-slate-900 dark:text-white'}"
      data-testid="hero-number"
    >
      {formatTokens(left)}
    </p>
    <p class="max-w-3xl text-slate-700 dark:text-slate-200" data-testid="hero-detail">
      {#if left < 0}
        Over-committed by {formatTokens(-left)}. The claims against this window exceed it—something
        has to give before any evidence fits.
      {:else if left === 0}
        Nothing is left. The claims against this window use all of it—something has to give before
        any evidence fits.
      {:else}
        {formatPercent(percentOf(left, scenario.capacity))} of the window, after {formatTokens(
          drawn(scenario),
        )} is claimed.
        {#if biggest}
          Largest single draw: <strong>{findTerm(biggest).name.toLowerCase()}</strong>.
        {/if}
      {/if}
    </p>
    {#if pinned}
      <p
        class="font-semibold text-slate-900 tabular-nums dark:text-white"
        data-testid="hero-versus"
      >
        {#if change === 0}
          Same usable budget as A.
        {:else}
          {formatChange(change)} usable vs A.
        {/if}
      </p>
    {/if}
    {#if evidence}
      <p class="max-w-3xl text-slate-700 dark:text-slate-200" data-testid="hero-evidence">
        {#if evidence.usable <= 0}
          Your evidence: {formatTokens(evidence.evidence)}, and the window has no room left for it.
          Over by {formatTokens(evidence.evidence - evidence.usable)}.
        {:else if evidence.fits}
          Your evidence: {formatTokens(evidence.evidence)} of {formatTokens(evidence.usable)} ({formatPercent(
            evidence.share ?? 0,
            0,
          )}), fits with {formatTokens(evidence.spare)} to spare.
        {:else}
          Your evidence: {formatTokens(evidence.evidence)} of {formatTokens(evidence.usable)} ({formatPercent(
            evidence.share ?? 0,
            0,
          )}), over by {formatTokens(evidence.over)}.
        {/if}
        <span class="text-sm text-slate-500 dark:text-slate-400">
          Estimated at {charactersPerToken} characters per token.
        </span>
      </p>
    {/if}
  </div>
</section>
