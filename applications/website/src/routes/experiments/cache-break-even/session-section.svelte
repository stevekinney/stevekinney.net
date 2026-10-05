<script lang="ts">
  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { parseTokenCount } from '$lib/experiments/format';

  import type { ContextReadout } from './context-readout';
  import { formatTokens } from './display';
  import {
    fieldClasses,
    headingClasses,
    hintClasses,
    labelClasses,
    panelClasses,
  } from './field-styles';
  import type { ModelPrice } from './pricing';
  import { isSessionFile } from './session-import';
  import type { SessionImport } from './session-import';

  type Props = {
    session: SessionImport | null;
    /** The model in the price table that the session's latest turn ran, if any. */
    matchedModel: ModelPrice | null;
    progress: { current: number; total: number } | null;
    message: string | null;
    error: string | null;
    pasteText: string;
    readout: ContextReadout | null;
    estimate: { average: string; turns: string };
    ready: boolean;
    onFiles: (files: Promise<SourceFile[]>) => void;
    onPasteInput: (text: string) => void;
    onUseReadout: () => void;
    onEstimateInput: (field: 'average' | 'turns', text: string) => void;
    onDiscard: () => void;
    onOpenPrices: () => void;
  };

  const {
    session,
    matchedModel,
    progress,
    message,
    error,
    pasteText,
    readout,
    estimate,
    ready,
    onFiles,
    onPasteInput,
    onUseReadout,
    onEstimateInput,
    onDiscard,
    onOpenPrices,
  }: Props = $props();

  const formatWhen = (timestamp: string | null): string => {
    const date = timestamp ? new Date(timestamp) : null;

    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : 'an unknown time';
  };

  const estimateTotal = $derived.by(() => {
    const average = parseTokenCount(estimate.average);
    const turns = parseTokenCount(estimate.turns);

    return average !== null && turns !== null && turns > 0 ? average * turns : null;
  });

  const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? '' : 's'}`;
</script>

<section aria-labelledby="session-heading" class={panelClasses}>
  <div class="space-y-1">
    <h2 id="session-heading" class={headingClasses}>Start from your session</h2>
    <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
      Fill in your context, your current model, and an estimate of the work left from a Claude Code
      session, or from a context readout you paste. Everything is read in your browser, and nothing
      you drop or paste is sent anywhere.
    </p>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <FileDropZone
      title="Use my session"
      draggingTitle="Drop to read the session"
      accept=".jsonl"
      folders
      keepFile={isSessionFile}
      captureWindowDrops
      busy={progress !== null}
      progress={progress ? `Reading file ${progress.current} of ${progress.total}…` : null}
      status={message}
      {onFiles}
    >
      <ul class="space-y-1">
        <li>
          Claude Code saves sessions as <code
            >~/.claude/<wbr />projects/<wbr />&lt;project&gt;/<wbr />&lt;session&gt;.jsonl</code
          >. That folder is hidden. In the macOS file picker, press ⌘⇧. to show it.
        </li>
        <li>Choose several files, or a folder, and the newest turn wins.</li>
      </ul>
    </FileDropZone>

    <div class="space-y-1.5">
      <label for="context-readout" class={labelClasses}>Or paste a context readout</label>
      <textarea
        id="context-readout"
        rows="4"
        value={pasteText}
        disabled={!ready}
        oninput={(event) => onPasteInput(event.currentTarget.value)}
        placeholder="312k/1000k tokens"
        spellcheck="false"
        aria-describedby="context-readout-hint"
        class="{fieldClasses} font-mono text-sm"></textarea>
      <p id="context-readout-hint" class={hintClasses}>
        Paste a line such as <code>312k/1000k tokens</code>, or the output of
        <code>claude -p "/context"</code>. The first pair is offered as N.
      </p>
      {#if readout}
        <div class="flex flex-wrap items-center gap-3" data-readout>
          <p class="text-sm text-slate-700 dark:text-slate-200">
            Found {formatTokens(readout.used)} of {formatTokens(readout.limit)} tokens.
          </p>
          <Button variant="secondary" size="small" onclick={onUseReadout}>
            Use {formatTokens(readout.used)} as N
          </Button>
        </div>
      {:else if pasteText.trim()}
        <p class="text-sm text-slate-600 dark:text-slate-300" data-readout-missing>
          No context readout in that text yet. Look for a pair such as 312k/1000k tokens.
        </p>
      {/if}
    </div>
  </div>

  {#if error}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
  {/if}

  {#if session}
    <div
      class="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
      data-session-summary
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <p
          class="min-w-0 text-base font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
          data-session-chip
        >
          Imported {plural(session.turns, 'turn')} · current context {formatTokens(
            session.contextTokens,
          )} · {matchedModel?.name ?? session.modelId} · median output {formatTokens(
            session.medianOutput,
          )}/turn
        </p>
        <Button variant="secondary" size="small" onclick={onDiscard}>Discard import</Button>
      </div>

      <ul class="space-y-1 text-sm text-slate-700 dark:text-slate-200">
        {#if !matchedModel}
          <li data-model-unmatched class="[overflow-wrap:anywhere]">
            This session’s latest turn ran <code>{session.modelId}</code>, which isn’t in your price
            table, so From model is unchanged. Add it under
            <button
              type="button"
              onclick={onOpenPrices}
              class="text-primary-700 dark:text-primary-300 cursor-pointer font-semibold underline underline-offset-2"
            >
              Prices and assumptions
            </button>
            to price it.
          </li>
        {/if}
        {#if session.lastCompaction}
          <li data-compaction>
            Last compacted at {formatWhen(session.lastCompaction.timestamp)}, context dropped from
            {formatTokens(session.lastCompaction.preTokens)} to {formatTokens(
              session.lastCompaction.postTokens,
            )} ({session.lastCompaction.trigger}).
          </li>
        {/if}
        {#if session.sidechainTurns > 0}
          <li>
            Left out {plural(session.sidechainTurns, 'subagent response')}, which aren’t part of the
            main context.
          </li>
        {/if}
        {#if session.skippedLines > 0 || session.unrecognizedFiles > 0}
          <li data-skipped>
            Skipped {plural(session.skippedLines, 'line')} that couldn’t be read as JSON{session.unrecognizedFiles >
            0
              ? `, and ${plural(session.unrecognizedFiles, 'file')} that didn’t look like a Claude Code session`
              : ''}.
          </li>
        {/if}
      </ul>

      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Estimate remaining work
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Average output per turn times the turns you expect to have left. Enter the turns, and R
          follows.
        </p>
        <div class="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div class="space-y-1.5">
            <label for="estimate-average" class={labelClasses}>Average output per turn</label>
            <input
              id="estimate-average"
              type="text"
              inputmode="numeric"
              value={estimate.average}
              oninput={(event) => onEstimateInput('average', event.currentTarget.value)}
              autocomplete="off"
              spellcheck="false"
              class="{fieldClasses} tabular-nums"
            />
          </div>
          <div class="space-y-1.5">
            <label for="estimate-turns" class={labelClasses}>Turns you expect remaining</label>
            <input
              id="estimate-turns"
              type="text"
              inputmode="numeric"
              value={estimate.turns}
              oninput={(event) => onEstimateInput('turns', event.currentTarget.value)}
              autocomplete="off"
              spellcheck="false"
              class="{fieldClasses} tabular-nums"
            />
          </div>
          <p class="pb-2 text-sm font-semibold text-slate-800 tabular-nums dark:text-slate-100">
            {estimateTotal === null
              ? 'Enter both to estimate R'
              : `≈ ${formatTokens(estimateTotal)} tokens`}
          </p>
        </div>
      </div>
    </div>
  {/if}
</section>
