<script lang="ts">
  import { TriangleAlert } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { readClaudeCodeTranscripts } from '$lib/experiments/claude-code-transcript';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import { calibrate } from './calibrate';
  import type { CacheAssessment, Calibration } from './calibrate';
  import { bodyClasses, codeClasses } from './field-styles';
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';
  import { formatPercent } from './field-parsing';
  import type { ModelPrice } from './pricing';

  type Props = {
    calibration: Calibration | null;
    models: ModelPrice[];
    /** What the last turn's age says about the cache, for the current TTL. */
    assessment: CacheAssessment | null;
    /** Whether the person has set the cache themselves since the import. */
    cacheOverridden: boolean;
    baseline: number;
    onCalibrated: (calibration: Calibration) => void;
    onDiscard: () => void;
    onUseBaseline: (tokens: number) => void;
    onOpenPriceTable: () => void;
  };

  const {
    calibration,
    models,
    assessment,
    cacheOverridden,
    baseline,
    onCalibrated,
    onDiscard,
    onUseBaseline,
    onOpenPriceTable,
  }: Props = $props();

  let progress = $state<{ current: number; total: number } | null>(null);
  // Set from the drop, before a dropped folder has been walked, so a second drop can't start.
  let loading = $state(false);
  let problem = $state<string | null>(null);
  let status = $state<string | null>(null);

  const isTranscript = (path: string): boolean => path.toLowerCase().endsWith('.jsonl');

  const load = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (loading) return;

    loading = true;
    problem = null;
    status = null;

    try {
      const files = await source;

      if (files.length === 0) {
        problem = 'That didn’t include any .jsonl files. Claude Code saves each session as one.';

        return;
      }

      progress = { current: 1, total: files.length };
      const transcript = await readClaudeCodeTranscripts(files, (index) => {
        progress = { current: index + 1, total: files.length };
      });
      const result = calibrate(transcript, models, Date.now());

      if (result.calibration) {
        onCalibrated(result.calibration);
        status = `Read ${files.length === 1 ? '1 file' : `${files.length} files`}.`;
      } else {
        problem = result.message;
      }
    } catch {
      problem = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      progress = null;
      loading = false;
    }
  };

  const plural = (count: number, word: string): string =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

  const triggerCounts = $derived.by(() => {
    const events = calibration?.compactions ?? [];
    const manual = events.filter((event) => event.trigger === 'manual').length;
    const auto = events.filter((event) => event.trigger === 'auto').length;

    return `${auto} auto, ${manual} manual`;
  });
</script>

<div class="space-y-4">
  <FileDropZone
    title="Calibrate from my session"
    draggingTitle="Drop to calibrate"
    accept=".jsonl"
    folders
    keepFile={isTranscript}
    busy={loading}
    progress={progress
      ? `Reading file ${progress.current} of ${progress.total}…`
      : loading
        ? 'Collecting files…'
        : null}
    {status}
    onFiles={load}
  >
    <p>
      Drop one or more Claude Code transcripts, one JSON object per line. They live in
      <code class={codeClasses}>~/.claude/<wbr />projects/<wbr />&lt;project&gt;/</code>, a hidden
      folder. In the macOS file picker, press ⌘⇧. to show it. Everything is read in this tab and
      nothing is sent anywhere.
    </p>
  </FileDropZone>

  {#if problem}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
  {/if}

  {#if calibration}
    <section
      aria-labelledby="calibration-heading"
      class="border-primary-300 dark:border-primary-700 space-y-4 rounded-lg border bg-white p-4 sm:p-5 dark:bg-slate-900"
      data-testid="calibration-summary"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="calibration-heading" class="text-lg font-bold text-slate-900 dark:text-white">
            Calibrated from your session
          </h3>
          <p class={bodyClasses}>
            {plural(calibration.files, 'file')}, {plural(calibration.turns, 'turn')} across {plural(
              calibration.sessions,
              'session',
            )}. Fields it filled in say “from your session” until you change them.
          </p>
        </div>
        <Button variant="secondary" size="small" onclick={onDiscard}>Discard import</Button>
      </div>

      <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Context now</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white">
            {formatTokens(calibration.contextNow)}
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Output per turn</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white">
            {formatTokens(calibration.outputPerTurn)} median
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Input per turn</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white">
            {calibration.inputPerTurn === null
              ? 'Not enough turns to measure'
              : `${formatTokens(calibration.inputPerTurn)} median of ${calibration.inputPairs}`}
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Summary size</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white">
            {calibration.summaryPercent === null
              ? 'No compactions found'
              : `${formatPercent(calibration.summaryPercent)} median`}
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Skipped lines</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white" data-testid="skipped-lines">
            {calibration.skippedLines}
          </dd>
        </div>
        {#if calibration.sidechainTurns > 0}
          <div>
            <dt class="font-semibold text-slate-700 dark:text-slate-200">Subagent responses</dt>
            <dd class="text-slate-900 tabular-nums dark:text-white">
              {calibration.sidechainTurns} left out
            </dd>
          </div>
        {/if}
        {#if calibration.pairsAcrossCompaction > 0}
          <div>
            <dt class="font-semibold text-slate-700 dark:text-slate-200">
              Turn pairs across a compaction
            </dt>
            <dd class="text-slate-900 tabular-nums dark:text-white">
              {calibration.pairsAcrossCompaction} left out
            </dd>
          </div>
        {/if}
      </dl>

      <ul class="space-y-2 text-sm {bodyClasses}">
        <li>
          {#if calibration.modelMatch}
            The latest turn ran <code class={codeClasses}>{calibration.modelId}</code>, which
            matches {calibration.modelMatch.name} in the price table.
          {:else}
            <span class="inline-flex items-start gap-2">
              <TriangleAlert
                aria-hidden="true"
                class="mt-0.5 size-4 flex-none text-amber-600 dark:text-amber-400"
              />
              <span>
                The latest turn ran <code class={codeClasses}>{calibration.modelId}</code>, which
                isn’t in the price table, so the model selection is unchanged.
                <button
                  type="button"
                  onclick={onOpenPriceTable}
                  class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer underline underline-offset-2 focus-visible:outline-2"
                >
                  Open the price table
                </button>
                to add it.
              </span>
            </span>
          {/if}
        </li>
        <li>
          {#if assessment}
            {assessment.sentence}
            {cacheOverridden
              ? 'You’ve since set the cache yourself, and that choice stands.'
              : 'Use the cache toggle to override it.'}
          {:else}
            Those files had no timestamps, so the cache setting is unchanged.
          {/if}
        </li>
        <li>
          The first turn’s context was {formatTokens(calibration.baselineEstimate)} tokens, a rough estimate
          of your baseline prefix.
          {#if calibration.baselineEstimate === baseline}
            It’s already the baseline.
          {:else}
            <button
              type="button"
              onclick={() => onUseBaseline(calibration.baselineEstimate)}
              class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer underline underline-offset-2 focus-visible:outline-2"
            >
              Use it as the baseline
            </button>
            or leave the {formatTokens(baseline)} default.
          {/if}
        </li>
      </ul>

      {#if calibration.compactions.length > 0}
        <details>
          <summary
            class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            {plural(calibration.compactions.length, 'compaction')} found ({triggerCounts})
          </summary>
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <div
            class="focus-visible:outline-primary-600 relative mt-2 max-h-52 overflow-y-auto focus-visible:outline-2"
            tabindex="0"
            role="region"
            aria-label="Compaction events"
          >
            <ul class="space-y-0.5 text-sm text-slate-700 tabular-nums dark:text-slate-200">
              {#each calibration.compactions as event, index (index)}
                <li>{event.label}.</li>
              {/each}
            </ul>
          </div>
        </details>
      {/if}
    </section>
  {/if}
</div>
