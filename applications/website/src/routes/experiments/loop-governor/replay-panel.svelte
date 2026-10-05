<script lang="ts">
  import { ClipboardPaste, X } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { formatCost } from '$lib/experiments/format';
  import { readLines } from '$lib/experiments/read-lines';

  import { bodyClasses, fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { createLogIntake, looksLikeTranscript, readLogText } from './log-intake';
  import type { LogIntake } from './log-intake';
  import {
    analyzeLog,
    counterfactual,
    counterfactualGovernors,
    fieldRoles,
    guessLowerIsBetter,
    guessMapping,
  } from './replay';
  import type { FieldMapping, FieldRole } from './replay';
  import ReplayChart from './replay-chart.svelte';

  type Props = {
    settings: { stallM: number; maxIterations: number; budget: number };
  };

  const { settings }: Props = $props();

  const roleLabels: Record<FieldRole, string> = {
    iteration: 'Iteration number',
    session: 'Session ID',
    cost: 'Cost in dollars',
    score: 'Score',
    kept: 'Kept',
    failure: 'Failure',
  };

  let intake = $state.raw<LogIntake | null>(null);
  let source = $state('');
  let mapping = $state<FieldMapping | null>(null);
  let lowerIsBetter = $state(false);
  let runningTotal = $state(false);
  let busy = $state(false);
  let progress = $state<string | null>(null);
  let error = $state<string | null>(null);
  let pasted = $state('');
  let chosen = $state(1);

  const load = (next: LogIntake, name: string): void => {
    if (next.log.records.length === 0) {
      error = `${name} has no lines that are JSON objects, so there’s nothing to replay.`;
      intake = null;
      mapping = null;

      return;
    }

    const guessed = guessMapping(next.log.keys);
    intake = next;
    source = name;
    mapping = guessed;
    lowerIsBetter = guessLowerIsBetter(guessed.score);
    runningTotal = false;
    error = null;
    chosen = 1;
  };

  const readFiles = async (files: Promise<SourceFile[]>): Promise<void> => {
    busy = true;
    error = null;

    try {
      const [first, ...rest] = await files;
      if (!first) return;

      progress = `Reading ${first.path}…`;
      const reader = createLogIntake(first.path);
      await readLines(first.file.stream(), reader.addLine);
      load(reader.finish(), first.path);
      if (rest.length > 0 && !error) {
        error = `Read ${first.path}. A replay is one run, so the other ${rest.length === 1 ? 'file was' : `${rest.length} files were`} left out.`;
      }
    } catch {
      error = 'That file couldn’t be read. Try again, or paste its lines below.';
    } finally {
      busy = false;
      progress = null;
    }
  };

  const readPasted = (): void => {
    if (pasted.trim() === '') return;
    load(readLogText('pasted lines', pasted), 'the pasted lines');
  };

  const clear = (): void => {
    intake = null;
    mapping = null;
    source = '';
    error = null;
  };

  const transcript = $derived(intake && mapping ? looksLikeTranscript(intake, mapping) : false);
  const replay = $derived(
    intake && mapping && !transcript
      ? analyzeLog(intake.log, { mapping, lowerIsBetter, costIsRunningTotal: runningTotal })
      : null,
  );
  const results = $derived(
    replay
      ? counterfactualGovernors(settings).map((governor) =>
          counterfactual(replay, governor, formatCost),
        )
      : [],
  );
  const selected = $derived(results[Math.min(chosen, results.length - 1)] ?? null);

  const setRole = (role: FieldRole, key: string): void => {
    if (!mapping) return;

    mapping = { ...mapping, [role]: key === '' ? null : key };
    if (role === 'score') lowerIsBetter = guessLowerIsBetter(mapping.score);
  };
</script>

<div class="space-y-6">
  <div class="grid gap-4 lg:grid-cols-2">
    <FileDropZone
      title="Drop a loop log here"
      draggingTitle="Drop to replay this log"
      accept=".jsonl,.ndjson,.json,.log,.txt"
      fileButtonLabel="Choose a log"
      {busy}
      {progress}
      status={intake && !busy
        ? `Read ${intake.log.records.length.toLocaleString('en-US')} iterations from ${source}.`
        : null}
      captureWindowDrops
      onFiles={(files) => void readFiles(files)}
      class="h-full"
    >
      JSON Lines, one line per iteration, with fields such as <code>iteration</code>,
      <code>session_id</code>, <code>cost_usd</code>, <code>score</code>, <code>kept</code>, and
      <code>failure</code>. Your log is read in your browser and never sent anywhere.
    </FileDropZone>
    <div class="flex flex-col gap-2">
      <label for="replay-paste" class={labelClasses}>Or paste the lines</label>
      <textarea
        id="replay-paste"
        bind:value={pasted}
        rows="6"
        spellcheck="false"
        placeholder={'{"iteration": 1, "cost_usd": 2.1, "score": 5, "kept": true}'}
        class="{fieldClasses} min-h-32 w-full flex-1 font-mono text-sm"></textarea>
      <div>
        <Button
          variant="secondary"
          size="small"
          icon={ClipboardPaste}
          disabled={pasted.trim() === ''}
          onclick={readPasted}>Replay the pasted lines</Button
        >
      </div>
    </div>
  </div>

  {#if error}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
  {/if}

  {#if intake && mapping}
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-lg font-bold [overflow-wrap:anywhere] text-slate-900 dark:text-white">
          Replaying {source}
        </h3>
        <Button variant="ghost" size="small" icon={X} onclick={clear}>Clear the replay</Button>
      </div>

      {#if transcript}
        <p role="note" class="text-amber-800 dark:text-amber-200" data-testid="transcript-note">
          This looks like a Claude Code session transcript, with {intake.transcript.turns.toLocaleString(
            'en-US',
          )} responses, not a loop log. A transcript has a line per message. A loop log has a line per
          iteration, written by the script around the agent. Map the fields below if this really is a
          loop log.
        </p>
      {/if}

      <fieldset class="space-y-3">
        <legend class="font-semibold text-slate-900 dark:text-white">Fields</legend>
        <p class={hintClasses}>Names vary from log to log, so check what each one reads from.</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each fieldRoles as role (role)}
            <div class="min-w-0 space-y-1">
              <label for="map-{role}" class={labelClasses}>{roleLabels[role]}</label>
              <select
                id="map-{role}"
                value={mapping[role] ?? ''}
                onchange={(event) => setRole(role, event.currentTarget.value)}
                class="{fieldClasses} w-full"
              >
                <option value="">None</option>
                {#each intake.log.keys as key (key)}
                  <option value={key}>{key}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-200">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={lowerIsBetter}
              class="accent-primary-600 size-4"
            />A lower score is better
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={runningTotal}
              class="accent-primary-600 size-4"
            />The cost is a running total
          </label>
        </div>
      </fieldset>

      {#if replay}
        {#each replay.notes as note (note)}
          <p role="note" class="text-sm text-amber-800 dark:text-amber-200">{note}</p>
        {/each}

        <p class={bodyClasses}>
          {replay.iterations.length.toLocaleString('en-US')} iterations, {formatCost(replay.total)} in
          total, {replay.iterations.filter((step) => step.progress).length} with progress.
        </p>

        <ReplayChart {replay} stopIndex={selected?.stopIndex ?? null} />

        <div class="space-y-2">
          <h4 class="font-bold text-slate-900 dark:text-white">
            What each governor would have done
          </h4>
          <p class={hintClasses}>
            Checked after each iteration, as in the simulation. Choose one to mark it on the chart.
          </p>
          <ul class="space-y-2" data-testid="counterfactuals">
            {#each results as result, index (result.name)}
              <li>
                <label
                  class="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <input
                    type="radio"
                    name="counterfactual"
                    value={index}
                    checked={chosen === index}
                    onchange={() => (chosen = index)}
                    class="accent-primary-600 mt-1 size-4 flex-none"
                  />
                  <span class="text-slate-800 dark:text-slate-100">{result.sentence}</span>
                </label>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}
</div>
