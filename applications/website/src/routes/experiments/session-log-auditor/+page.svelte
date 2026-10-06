<script lang="ts">
  import { ShieldCheck } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import SEO from '$lib/components/seo.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { formatTokenCount } from '$lib/experiments/format';
  import { url } from '$lib/metadata';
  import { buildBreadcrumbSchema } from '$lib/structured-data';

  import { analyze } from './analysis';
  import type { AuditData } from './audit-data';
  import ClustersTable from './clusters-table.svelte';
  import { experiment } from './experiment';
  import {
    bodyClasses,
    buttonClasses,
    codeClasses,
    headingClasses,
    linkButtonClasses,
  } from './field-styles';
  import { createLatestRequest } from './latest-request';
  import { isAbortError, isSessionFile, readSessionFiles } from './read-sessions';
  import type { ReadProgress } from './read-sessions';
  import { defaultRules } from './rules';
  import { readSample, SAMPLE_NOTICE } from './sample';
  import TimelinePanel from './timeline-panel.svelte';

  const { data } = $props();

  const jsonLd = buildBreadcrumbSchema([
    { name: 'Experiments', url: `${url}/experiments` },
    { name: experiment.title, url: `${url}/experiments/session-log-auditor` },
  ]);

  // The page opens on the sample, so the answer is there before anything is dropped.
  const sample = readSample();

  let records = $state.raw<AuditData>(sample);
  let busy = $state(false);
  let progress = $state<ReadProgress | null>(null);
  let status = $state<string | null>(null);
  let error = $state<string | null>(null);
  let controller: AbortController | null = null;

  const isSample = $derived(records === sample);
  const analysis = $derived(analyze(records));
  const floorPercent = $derived(
    analysis.floorShare === null ? null : Math.round(analysis.floorShare * 100),
  );

  const percent = $derived(
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.read / progress.total) * 100))
      : 0,
  );
  const progressText = $derived(
    progress
      ? `Reading file ${formatTokenCount(progress.file)} of ${formatTokenCount(progress.files)}, ${percent}%`
      : null,
  );

  const plural = (count: number, noun: string): string =>
    `${formatTokenCount(count)} ${noun}${count === 1 ? '' : 's'}`;

  // A folder drop can still be walking when a file is chosen, and only the newest one is read.
  const requests = createLatestRequest();

  const readFiles = async (files: SourceFile[]): Promise<void> => {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    busy = true;
    error = null;
    status = null;
    progress = null;

    try {
      if (files.length === 0) {
        error = 'No .jsonl files there. Claude Code’s transcripts end in .jsonl.';

        return;
      }

      const result = await readSessionFiles(files, {
        signal: current.signal,
        onProgress: (next) => (progress = next),
      });

      status = [
        `Read ${plural(result.files.length, 'file')}`,
        plural(result.sessions.length, 'session'),
        result.skippedLines > 0 ? `skipped ${plural(result.skippedLines, 'malformed line')}` : '',
      ]
        .filter(Boolean)
        .join(', ')
        .concat('.');

      if (result.sessions.length === 0) {
        error = 'Nothing in those files looked like a Claude Code session.';
      } else {
        records = result;
      }
    } catch (caught) {
      if (isAbortError(caught)) {
        if (controller === current) status = 'Cancelled. Nothing new was loaded.';
      } else {
        error = `Couldn’t read those files: ${caught instanceof Error ? caught.message : String(caught)}`;
      }
    } finally {
      if (controller === current) {
        busy = false;
        controller = null;
      }
    }
  };

  const handleFiles = (files: Promise<SourceFile[]>): void => {
    void requests.follow(files, readFiles, () => {
      error = 'Couldn’t open what was dropped. Try choosing the files instead.';
    });
  };

  const showSample = (): void => {
    requests.start();
    controller?.abort();
    records = sample;
    status = null;
    error = null;
  };

  onMount(() => () => controller?.abort());
</script>

<SEO title={data.title} description={data.description} {jsonLd} />

<div class="space-y-12">
  <header class="max-w-3xl space-y-3">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Is it the model, or your machine?
    </h1>
    <p class="text-lg text-slate-600 dark:text-slate-300">
      When an agent session goes badly, it’s tempting to blame the model. Often it’s the floor: a
      missing command, a shell option, a type definition that isn’t installed. A smarter model won’t
      fix any of those. This page reads your session transcripts and finds the failures that keep
      coming back.
    </p>
  </header>

  <section aria-labelledby="answer-heading" class="max-w-3xl space-y-5">
    <div class="space-y-2" data-testid="verdict">
      {#if isSample}
        <p
          class="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-slate-700 uppercase dark:bg-slate-800 dark:text-slate-200"
          data-testid="sample-label"
        >
          Sample data
        </p>
      {/if}
      <h2 id="answer-heading" class="text-2xl font-bold text-slate-900 dark:text-white">
        {#if floorPercent === null}
          No failed tool calls in {plural(analysis.sessions, 'session')}.
        {:else}
          <span data-testid="floor-share">{floorPercent}%</span> of failures came from the floor.
        {/if}
      </h2>
      {#if floorPercent !== null}
        <p class={bodyClasses}>
          {plural(analysis.floorFailures, 'failed tool call')} out of {formatTokenCount(
            analysis.failures,
          )}, in {formatTokenCount(analysis.floorSessions)} of {plural(
            analysis.sessions,
            'session',
          )}, came from the environment rather than the work. Fix those once and they stop for every
          model.
        </p>
      {/if}
      {#if isSample}
        <p class={bodyClasses} data-testid="sample-notice">{SAMPLE_NOTICE}</p>
      {:else}
        <button type="button" class={linkButtonClasses} onclick={showSample}>
          Show the sample again
        </button>
      {/if}
    </div>

    <p
      class="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
    >
      <ShieldCheck aria-hidden="true" class="mt-0.5 size-5 flex-none" />
      <span>
        <strong>Everything stays on your machine.</strong> Transcripts hold your source code and maybe
        secrets, so this page reads them in this tab and never sends them anywhere.
      </span>
    </p>

    <FileDropZone
      title="Drop your session transcripts or whole folders here"
      draggingTitle="Drop to read these sessions"
      accept=".jsonl"
      folders
      captureWindowDrops
      keepFile={isSessionFile}
      fileButtonLabel="Choose files"
      folderButtonLabel="Choose a folder"
      {busy}
      progress={progressText}
      {status}
      onFiles={handleFiles}
    >
      Claude Code keeps one <code class={codeClasses}>.jsonl</code> file per session in
      <code class="{codeClasses} [overflow-wrap:anywhere]">~/.claude/projects/</code>. Drop that
      folder, or one project inside it. Subagent transcripts in a
      <code class={codeClasses}>subagents</code> folder count toward the session they sit beside.
    </FileDropZone>

    {#if busy}
      <div class="flex flex-wrap items-center gap-3" data-testid="read-progress">
        <progress
          max="100"
          value={percent}
          aria-label="Reading transcripts"
          class="accent-primary-600 h-2 min-w-0 flex-1"
        ></progress>
        <button type="button" class={buttonClasses} onclick={() => controller?.abort()}>
          Cancel
        </button>
      </div>
    {/if}

    {#if error}
      <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
    {/if}
  </section>

  <section aria-labelledby="clusters-heading" class="space-y-4">
    <h2 id="clusters-heading" class={headingClasses}>The failures that keep coming back</h2>
    <ClustersTable clusters={analysis.clusters} />
  </section>

  <section aria-labelledby="timeline-heading" class="space-y-4">
    <div class="space-y-1">
      <h2 id="timeline-heading" class={headingClasses}>Failures per day</h2>
      <p class={bodyClasses}>Stacked by category, so a fix shows up as a cliff.</p>
    </div>
    <TimelinePanel timeline={analysis.timeline} categories={analysis.categories} />
  </section>

  <section aria-labelledby="notes-heading" class="max-w-3xl space-y-4">
    <h2 id="notes-heading" class={headingClasses}>Reading the result</h2>
    <div class="space-y-3 {bodyClasses}">
      <p>
        Failures are grouped by tool and by the line that names the error, with numbers, paths, and
        names swapped for placeholders, so the same failure in different sessions lands in one row.
        Rows are ranked by sessions affected, not occurrences: one session retrying a dead database
        200 times is one bad session, while a missing command that hits a session a day is a habit.
      </p>
      <p>
        <strong>Floor</strong> means your environment: fix it once, in the repository or the
        machine, and it stops for every model. <strong>Harness</strong> means the tool call was
        refused before anything ran. <strong>Task</strong> is everything the rules don’t match, such
        as a failing test, which is the work itself and the model’s to fix.
        <strong>Floor or task</strong> could be either; the examples usually tell you which.
      </p>
      <p>
        When you fix something on the floor, its color should drop out of the chart on the day you
        fixed it and stay gone. If it comes back, the fix didn’t stick.
      </p>
    </div>

    <h3 class="font-semibold text-slate-900 dark:text-white">The rules</h3>
    <p class={bodyClasses}>
      Each cluster gets the first category whose text appears in its error, ignoring case. Anything
      no rule matches is the task.
    </p>
    <ul class="space-y-2 text-sm text-slate-700 dark:text-slate-200" data-testid="rules-list">
      {#each defaultRules as rule (rule.id)}
        <li>
          <strong>{rule.category}</strong>:
          {#each rule.pattern.split('|') as pattern, index (pattern)}{index > 0 ? ', ' : ''}<code
              class={codeClasses}>{pattern.trim()}</code
            >{/each}. {rule.why}
        </li>
      {/each}
    </ul>
  </section>
</div>
