<script lang="ts">
  import { ShieldCheck } from '@lucide/svelte';

  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import { formatTokenCount } from '$lib/experiments/format';

  import {
    bodyClasses,
    buttonClasses,
    codeClasses,
    fieldClasses,
    labelClasses,
  } from './field-styles';
  import { isSessionFile } from './read-sessions';
  import type { ReadProgress } from './read-sessions';

  type PresetChoice = { id: string; name: string };

  type Props = {
    ready: boolean;
    busy: boolean;
    progress: ReadProgress | null;
    status: string | null;
    error: string | null;
    presets: readonly PresetChoice[];
    presetId: string | null;
    presetNotice: string | null;
    onFiles: (files: Promise<SourceFile[]>) => void;
    onPaste: (text: string) => void;
    onPreset: (id: string) => void;
    onCancel: () => void;
  };

  const {
    ready,
    busy,
    progress,
    status,
    error,
    presets,
    presetId,
    presetNotice,
    onFiles,
    onPaste,
    onPreset,
    onCancel,
  }: Props = $props();

  let pasted = $state('');

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
</script>

<div class="space-y-5">
  <p
    class="flex max-w-3xl items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
  >
    <ShieldCheck aria-hidden="true" class="mt-0.5 size-5 flex-none" />
    <span>
      <strong>Everything stays on your machine.</strong> Transcripts hold your source code and maybe secrets,
      so this page reads them in this tab and never sends them anywhere. There’s no server and no model
      involved.
    </span>
  </p>

  <FileDropZone
    title="Drop session transcripts or whole folders here"
    draggingTitle="Drop to audit these sessions"
    accept=".jsonl"
    folders
    captureWindowDrops
    keepFile={isSessionFile}
    fileButtonLabel="Choose files"
    folderButtonLabel="Choose a folder"
    {busy}
    progress={progressText}
    {status}
    {onFiles}
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
      <button type="button" class={buttonClasses} onclick={onCancel}>Cancel</button>
    </div>
  {/if}

  {#if error}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
  {/if}

  <div class="space-y-2">
    <p id="preset-heading" class={labelClasses}>Or try a made-up set of sessions</p>
    <div role="group" aria-labelledby="preset-heading" class="flex flex-wrap gap-2">
      {#each presets as preset (preset.id)}
        <button
          type="button"
          disabled={!ready || busy}
          aria-pressed={presetId === preset.id}
          onclick={() => onPreset(preset.id)}
          class="focus-visible:outline-primary-600 aria-pressed:bg-primary-700 dark:aria-pressed:bg-primary-300 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-transparent aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:text-slate-900"
        >
          {preset.name}
        </button>
      {/each}
    </div>
    {#if presetNotice}
      <p class="max-w-3xl {bodyClasses}" aria-live="polite" data-testid="preset-notice">
        {presetNotice}
      </p>
    {/if}
  </div>

  <details class="group max-w-3xl">
    <summary class="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">
      Paste a transcript instead
    </summary>
    <div class="mt-3 space-y-2">
      <label for="pasted-transcript" class={labelClasses}>Transcript lines (JSON Lines)</label>
      <textarea
        id="pasted-transcript"
        rows="6"
        bind:value={pasted}
        spellcheck="false"
        class="{fieldClasses} w-full font-mono text-xs"
        placeholder={'{"type":"assistant","sessionId":"…","message":{…}}'}></textarea>
      <button
        type="button"
        class={buttonClasses}
        disabled={!ready || busy || pasted.trim() === ''}
        onclick={() => onPaste(pasted)}
      >
        Audit the pasted lines
      </button>
    </div>
  </details>
</div>
