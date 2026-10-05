<script lang="ts">
  import { Copy, Link, Pin, PinOff } from '@lucide/svelte';
  import { tick } from 'svelte';

  import Button from '$lib/components/button';

  import { copyText } from '$lib/experiments/copy-text';
  import { analyticRows } from './analytic';
  import AnalyticTable from './analytic-table.svelte';
  import CostComparison from './cost-comparison.svelte';
  import CostHistogram from './cost-histogram.svelte';
  import { bodyClasses, headingClasses } from './field-styles';
  import { formatCount, formatShare } from './labels';
  import type { Config } from './loop-config';
  import OutcomeBar from './outcome-bar.svelte';
  import RunTimeline from './run-timeline.svelte';
  import { encodeState } from './share-link';
  import type { Tally } from './simulate';
  import { costHistogram, settledMaximum } from './statistics';
  import { buildSummary } from './summary';

  type Props = {
    ready: boolean;
    config: Config;
    tally: Tally;
    /** The tally's configuration, which lags the controls while a batch runs. */
    tallied: Config;
    pinned: { config: Config; tally: Tally } | null;
    simulating: boolean;
    simulated: number;
    onTogglePin: () => void;
  };

  const { ready, config, tally, tallied, pinned, simulating, simulated, onTogglePin }: Props =
    $props();

  let shareMessage = $state<string | null>(null);
  let manualCopy = $state<string | null>(null);
  let manualCopyBox: HTMLTextAreaElement | undefined = $state();

  const rows = $derived(analyticRows(tallied, tally));
  const sharedAxis = $derived(
    pinned ? Math.max(settledMaximum(tally), settledMaximum(pinned.tally)) : 0,
  );
  const histogram = $derived(costHistogram(tally, 20, sharedAxis));
  const pinnedHistogram = $derived(pinned ? costHistogram(pinned.tally, 20, sharedAxis) : null);

  const sharedLink = (): string =>
    `${window.location.origin}${window.location.pathname}#${encodeState({
      config,
      pinned: pinned?.config ?? null,
    })}`;

  // The clipboard can reject. Then the text goes in a box, already selected.
  const copy = async (text: string, copied: string): Promise<void> => {
    if (await copyText(text)) {
      manualCopy = null;
      shareMessage = copied;

      return;
    }

    manualCopy = text;
    shareMessage = 'Couldn’t reach the clipboard. Press Command-C or Control-C to copy it.';
    await tick();
    manualCopyBox?.select();
  };

  const copyLink = (): Promise<void> =>
    copy(
      sharedLink(),
      'Link copied. It holds the configuration, the seed, and A, and nothing from a replayed log.',
    );

  const copySummary = (): Promise<void> =>
    copy(buildSummary(tallied, tally, sharedLink()), 'Summary copied as Markdown.');
</script>

<section aria-labelledby="outcomes-heading" class="space-y-6">
  <div class="space-y-1">
    <h2 id="outcomes-heading" class={headingClasses}>How the runs ended</h2>
    <p class={bodyClasses} aria-live="polite" data-testid="simulation-status">
      {#if simulating}
        Simulating… {formatCount(simulated)} of {formatCount(config.runs)} runs.
      {:else}
        {formatCount(tally.runs)} runs, seed {tallied.seed}.
      {/if}
    </p>
    {#if simulating}
      <progress
        max={config.runs}
        value={simulated}
        aria-label="Simulation progress"
        class="accent-primary-600 h-2 w-full max-w-md"
      ></progress>
    {/if}
  </div>

  <div class="grid gap-8 {pinned ? 'lg:grid-cols-2' : ''}">
    {#if pinned}
      <OutcomeBar id="a" tally={pinned.tally} title="A (pinned)" />
    {/if}
    <OutcomeBar id="b" {tally} title={pinned ? 'B (current)' : undefined} />
  </div>

  {#if tallied.dual}
    <p class="text-slate-700 dark:text-slate-200" data-testid="premature-claims">
      The dual condition caught {formatCount(tally.prematureClaims)} premature claims, in
      {formatCount(tally.runsWithClaims)} of {formatCount(tally.runs)} runs ({formatShare(
        tally.runsWithClaims / Math.max(1, tally.runs),
      )}). False done is {formatShare(tally.outcomes['done-false'] / Math.max(1, tally.runs))}. That
      count is your false-completion rate, and now you can track it.
    </p>
  {/if}

  <AnalyticTable {rows} runs={tally.runs} />

  <div class="space-y-3">
    <div class="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="small"
        icon={pinned ? PinOff : Pin}
        disabled={!ready || simulating}
        onclick={onTogglePin}
      >
        {pinned ? 'Unpin A' : 'Pin this as A to compare'}
      </Button>
      <Button variant="secondary" size="small" icon={Link} disabled={!ready} onclick={copyLink}>
        Copy link
      </Button>
      <Button
        variant="secondary"
        size="small"
        icon={Copy}
        disabled={!ready || simulating}
        onclick={copySummary}
      >
        Copy summary
      </Button>
    </div>
    {#if shareMessage}
      <p role="status" class="text-sm text-slate-600 dark:text-slate-300">{shareMessage}</p>
    {/if}
    {#if manualCopy}
      <textarea
        bind:this={manualCopyBox}
        readonly
        rows="4"
        aria-label="Text to copy"
        class="w-full rounded-md border border-slate-300 p-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
        >{manualCopy}</textarea
      >
    {/if}
  </div>
</section>

<section aria-labelledby="cost-heading" class="space-y-6">
  <div class="space-y-1">
    <h2 id="cost-heading" class={headingClasses}>What the runs cost</h2>
    <p class={bodyClasses}>
      Total cost per run, with the median, the 95th percentile, and the maximum marked. Runs that
      never stopped sit in their own bin, so they don’t squash the rest.
    </p>
  </div>
  <div class="grid gap-8 {pinnedHistogram ? 'lg:grid-cols-2' : ''}">
    {#if pinnedHistogram && pinned}
      <CostHistogram
        id="a"
        histogram={pinnedHistogram}
        runs={pinned.tally.runs}
        title="A (pinned)"
      />
    {/if}
    <CostHistogram
      id="b"
      {histogram}
      runs={tally.runs}
      title={pinned ? 'B (current)' : undefined}
    />
  </div>
  <h3 class="text-lg font-bold text-slate-900 dark:text-white">
    Fresh against accumulating context
  </h3>
  <CostComparison {config} />
</section>

<section aria-labelledby="run-heading" class="space-y-4">
  <div class="space-y-1">
    <h2 id="run-heading" class={headingClasses}>One run, iteration by iteration</h2>
    <p class={bodyClasses}>
      The first run from seed {config.seed}. Touch STOP while it plays to see whether anything in
      your loop is listening.
    </p>
  </div>
  <RunTimeline {config} {ready} />
</section>
