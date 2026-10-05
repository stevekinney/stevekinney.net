<script lang="ts">
  import Button from '$lib/components/button';
  import { readClaudeCodeTranscripts } from '$lib/experiments/claude-code-transcript';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { formatCompactTokenCount as formatTokens } from '$lib/experiments/format';

  import { calibrateSpawnOverhead, readPastedTranscript } from './calibrate';
  import type { CalibrationResult, SpawnCalibration } from './calibrate';
  import {
    bodyClasses,
    codeClasses,
    fieldClasses,
    hintClasses,
    labelClasses,
  } from './field-styles';

  type Props = {
    calibration: SpawnCalibration | null;
    spawnTokens: number;
    onCalibrated: (calibration: SpawnCalibration) => void;
    onUse: (tokens: number) => void;
    onDiscard: () => void;
  };

  const { calibration, spawnTokens, onCalibrated, onUse, onDiscard }: Props = $props();

  let progress = $state<{ current: number; total: number } | null>(null);
  let problem = $state<string | null>(null);
  let status = $state<string | null>(null);
  let pasted = $state('');

  const isTranscript = (path: string): boolean => path.toLowerCase().endsWith('.jsonl');

  const plural = (count: number, word: string): string =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

  const settle = (result: CalibrationResult): void => {
    if (result.calibration) {
      onCalibrated(result.calibration);
      problem = null;
    } else {
      problem = result.message;
    }
  };

  const load = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (progress) return;

    problem = null;
    status = null;

    try {
      const files = await source;

      if (files.length === 0) {
        problem = 'That didn’t include any .jsonl files. Claude Code saves each transcript as one.';

        return;
      }

      progress = { current: 1, total: files.length };
      const transcript = await readClaudeCodeTranscripts(files, (index) => {
        progress = { current: index + 1, total: files.length };
      });
      settle(calibrateSpawnOverhead(transcript));
      status = `Read ${plural(files.length, 'file')}.`;
    } catch {
      problem = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      progress = null;
    }
  };

  const readPasted = (): void => {
    status = null;
    if (!pasted.trim()) {
      problem = 'Paste one or more lines from a subagent transcript first.';

      return;
    }

    settle(calibrateSpawnOverhead(readPastedTranscript(pasted)));
  };
</script>

<div class="space-y-4">
  <div class="grid gap-4 lg:grid-cols-2">
    <FileDropZone
      title="Calibrate from real sessions"
      draggingTitle="Drop to measure"
      accept=".jsonl"
      folders
      keepFile={isTranscript}
      busy={progress !== null}
      progress={progress ? `Reading file ${progress.current} of ${progress.total}…` : null}
      {status}
      onFiles={load}
      class="h-full"
    >
      <p>
        Choose a session’s folder, or the <code class={codeClasses}>subagents</code> folder inside
        it. Claude Code keeps them in
        <code class={codeClasses}>~/.claude/<wbr />projects/<wbr />&lt;project&gt;/</code>, a hidden
        folder: in the macOS file picker, press ⌘⇧. to show it. Everything is read in this tab and
        nothing is sent anywhere.
      </p>
    </FileDropZone>

    <div class="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <label for="pasted-transcript" class={labelClasses}>Or paste transcript lines</label>
      <textarea
        id="pasted-transcript"
        bind:value={pasted}
        rows="5"
        spellcheck="false"
        autocomplete="off"
        aria-describedby="pasted-transcript-hint"
        placeholder={'{"type":"assistant","isSidechain":true,…}'}
        class="{fieldClasses} min-h-28 w-full flex-1 font-mono text-xs"></textarea>
      <p id="pasted-transcript-hint" class={hintClasses}>
        JSON Lines from a subagent transcript, one object per line. Pasted text is read in this tab
        and never sent anywhere.
      </p>
      <div>
        <Button variant="secondary" size="small" onclick={readPasted}>Measure pasted lines</Button>
      </div>
    </div>
  </div>

  {#if problem}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
  {/if}

  {#if calibration}
    <section
      aria-labelledby="calibration-heading"
      class="border-primary-300 dark:border-primary-700 space-y-3 rounded-lg border bg-white p-4 sm:p-5 dark:bg-slate-900"
      data-testid="calibration-summary"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h3 id="calibration-heading" class="text-lg font-bold text-slate-900 dark:text-white">
          Spawn overhead from your sessions
        </h3>
        <Button variant="secondary" size="small" onclick={onDiscard}>Discard</Button>
      </div>

      <dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Subagents measured</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white">{calibration.subagents}</dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Median</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white" data-testid="spawn-median">
            {formatTokens(calibration.median)}
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Range</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white" data-testid="spawn-range">
            {formatTokens(calibration.minimum)} to {formatTokens(calibration.maximum)}
          </dd>
        </div>
        <div>
          <dt class="font-semibold text-slate-700 dark:text-slate-200">Malformed lines skipped</dt>
          <dd class="text-slate-900 tabular-nums dark:text-white" data-testid="skipped-lines">
            {calibration.skippedLines}
          </dd>
        </div>
      </dl>

      <p class={bodyClasses}>
        Each number is a subagent’s context on its first response: uncached input, cache reads, and
        cache writes, counted once per message. It includes the brief the coordinator wrote, so it’s
        the overhead plus the task description. The course outline puts the overhead alone at
        7.5K–44K.
      </p>

      {#if spawnTokens === calibration.median}
        <p class={bodyClasses}>The spawn overhead is set to this median.</p>
      {:else}
        <Button size="small" onclick={() => onUse(calibration.median)}>
          Use {formatTokens(calibration.median)} as the spawn overhead
        </Button>
      {/if}
    </section>
  {/if}
</div>
