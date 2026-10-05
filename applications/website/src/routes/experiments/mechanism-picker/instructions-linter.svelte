<script lang="ts">
  import { Copy, Download } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import { copyText } from './copy-text';
  import { downloadText } from './download';
  import {
    bodyClasses,
    chipClasses,
    fieldClasses,
    labelClasses,
    subheadingClasses,
  } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { lintInstructions, summarize } from './lint';
  import type { LintItem } from './lint';
  import { lintPresets } from './lint-presets';
  import { buildLintReport } from './lint-report';
  import { classificationLabels } from './lint-rules';
  import type { LintRules } from './lint-rules';
  import { classificationClasses } from './mode-styles';
  import OutlineBadge from './outline-badge.svelte';
  import { readTextFile } from './read-text-file';
  import RewriteHelper from './rewrite-helper.svelte';
  import RuleEditor from './rule-editor.svelte';

  type Props = {
    text: string;
    fileName: string | null;
    presetId: string | null;
    rules: LintRules;
    selectedLine: number | null;
    ready: boolean;
    onText: (text: string, fileName: string | null, presetId: string | null) => void;
    onRules: (rules: LintRules) => void;
    onSelectLine: (item: LintItem | null) => void;
  };

  const {
    text,
    fileName,
    presetId,
    rules,
    selectedLine,
    ready,
    onText,
    onRules,
    onSelectLine,
  }: Props = $props();

  const items = $derived(lintInstructions(text, rules));
  const summary = $derived(summarize(items));
  const selected = $derived(items.find((item) => item.lineNumber === selectedLine) ?? null);
  const report = $derived(buildLintReport(items, fileName));

  let busy = $state(false);
  let status = $state<string | null>(null);
  let problem = $state<string | null>(null);
  let message = $state<string | null>(null);
  let fallbackText = $state<string | null>(null);
  let fallbackField = $state<HTMLTextAreaElement | undefined>();

  const readFiles = async (files: Promise<SourceFile[]>): Promise<void> => {
    busy = true;
    problem = null;
    status = null;
    try {
      const [first] = await files;
      if (!first) return;

      const read = await readTextFile(first.file);
      if (read.ok) {
        onText(read.text, first.file.name, null);
        status = `Read ${first.file.name}.`;
      } else {
        problem = read.reason;
      }
    } catch {
      problem = 'Couldn’t read that file.';
    } finally {
      busy = false;
    }
  };

  const copyReport = async (): Promise<void> => {
    if (await copyText(report)) {
      fallbackText = null;
      message = 'Report copied as Markdown.';
    } else {
      fallbackText = report;
      message =
        'Couldn’t reach the clipboard. Press ⌘C on a Mac, or Ctrl+C, to copy the selected text.';
      queueMicrotask(() => fallbackField?.select());
    }
  };
</script>

<div class="space-y-6">
  <div class="space-y-2">
    <p class={labelClasses} id="lint-presets-label">Start from an example</p>
    <div role="group" aria-labelledby="lint-presets-label" class="flex flex-wrap gap-2">
      {#each lintPresets as preset (preset.id)}
        <button
          type="button"
          class={chipClasses}
          disabled={!ready}
          aria-pressed={presetId === preset.id}
          onclick={() => onText(preset.text, preset.fileName, preset.id)}
        >
          {preset.label}
        </button>
      {/each}
      <button
        type="button"
        class={chipClasses}
        disabled={!ready || text === ''}
        onclick={() => onText('', null, null)}
      >
        Clear
      </button>
    </div>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <div class="space-y-1.5">
      <label for="lint-source" class={labelClasses}>Paste your CLAUDE.md or AGENTS.md</label>
      <textarea
        id="lint-source"
        class="{fieldClasses} min-h-48 font-mono text-sm"
        value={text}
        disabled={!ready}
        aria-describedby="paste-privacy"
        oninput={(event) => onText(event.currentTarget.value, fileName, null)}></textarea>
      <span id="paste-privacy" class="block text-sm text-slate-500 dark:text-slate-400">
        Everything is classified in your browser. Nothing you paste or upload is sent anywhere, and
        none of it goes in a shared link.
      </span>
    </div>
    <div class="space-y-2">
      <FileDropZone
        class="h-full"
        title="Or drop the file here"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        fileButtonLabel="Choose a file"
        onFiles={readFiles}
        {busy}
        {status}
      >
        Processed on your machine and never transmitted.
      </FileDropZone>
      {#if problem}
        <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
      {/if}
    </div>
  </div>

  <section aria-labelledby="lint-results-heading" class="space-y-4">
    <div class="space-y-2">
      <h3 id="lint-results-heading" class={subheadingClasses}>
        What the linter found{#if fileName}&nbsp;in <span class="[overflow-wrap:anywhere]"
            >{fileName}</span
          >{/if}
      </h3>
      <p
        class="font-semibold text-slate-900 dark:text-white"
        data-testid="lint-summary"
        aria-live="polite"
      >
        {summary}
      </p>
      <p class={bodyClasses}>
        A giant living wiki hides the few rules that matter. Every line here loads into every
        session. <OutlineBadge />
      </p>
    </div>

    {#if text.trim() === ''}
      <p class={bodyClasses}>
        Paste a file, drop one, or pick an example to see each line classified.
      </p>
    {:else if items.length === 0}
      <p class={bodyClasses} data-testid="lint-empty">
        There’s nothing to classify: the file is only headings, code blocks, or blank lines.
      </p>
    {:else}
      <ol class="space-y-2" data-testid="lint-items">
        {#each items as item (item.lineNumber)}
          <li
            data-line={item.lineNumber}
            data-classification={item.primary}
            class="space-y-1.5 rounded-lg border p-3 {selectedLine === item.lineNumber
              ? 'border-primary-600 dark:border-primary-400 ring-primary-600 dark:ring-primary-400 ring-1'
              : 'border-slate-200 dark:border-slate-700'}"
          >
            <div class="flex flex-wrap items-start gap-2">
              <span class="font-mono text-xs text-slate-500 dark:text-slate-400"
                >Line {item.lineNumber}</span
              >
              <span
                data-testid="classification"
                class="rounded px-1.5 py-0.5 text-xs font-bold ring-1 {classificationClasses[
                  item.primary
                ]}"
              >
                {classificationLabels[item.primary]}
              </span>
              {#each item.matches.slice(1) as match (match.classification)}
                <span
                  data-testid="secondary"
                  class="rounded px-1.5 py-0.5 text-xs text-slate-600 ring-1 ring-slate-300 dark:text-slate-300 dark:ring-slate-600"
                >
                  also {classificationLabels[match.classification].toLowerCase()}
                </span>
              {/each}
            </div>
            <p
              class="max-h-40 overflow-y-auto font-mono text-sm [overflow-wrap:anywhere] text-slate-900 dark:text-white"
            >
              {item.text}
            </p>
            {#if item.truncated}
              <p class="text-xs text-slate-500 dark:text-slate-400">
                A very long line: only its first 4,000 characters were checked.
              </p>
            {/if}
            <p class="text-sm text-slate-800 dark:text-slate-100" data-testid="suggestion">
              <InlineCode text={item.suggestion} />
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400" data-testid="rule">
              Rule that fired: {item.rule}
            </p>
            <button
              type="button"
              class="text-primary-700 dark:text-primary-300 focus-visible:outline-primary-600 cursor-pointer text-sm font-semibold underline underline-offset-2 focus-visible:outline-2"
              aria-pressed={selectedLine === item.lineNumber}
              onclick={() => onSelectLine(selectedLine === item.lineNumber ? null : item)}
            >
              {selectedLine === item.lineNumber ? 'Selected' : 'Select'}<span class="sr-only">
                line {item.lineNumber}</span
              > to light its rung and rewrite it
            </button>
          </li>
        {/each}
      </ol>

      {#if selected}
        <RewriteHelper line={selected.text} lineNumber={selected.lineNumber} onCopy={copyText} />
      {/if}

      <div class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="small"
            icon={Download}
            disabled={!ready}
            onclick={() => downloadText('instructions-lint.md', report, 'text/markdown')}
          >
            Download report
          </Button>
          <Button
            variant="secondary"
            size="small"
            icon={Copy}
            disabled={!ready}
            onclick={copyReport}
          >
            Copy report as Markdown
          </Button>
        </div>
        <p class="min-h-5 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {message}
        </p>
        {#if fallbackText !== null}
          <label class="block text-sm text-slate-600 dark:text-slate-300">
            <span class="sr-only">Report to copy</span>
            <textarea
              bind:this={fallbackField}
              readonly
              rows="6"
              value={fallbackText}
              onfocus={(event) => event.currentTarget.select()}
              class="{fieldClasses} font-mono text-xs"></textarea>
          </label>
        {/if}
      </div>
    {/if}
  </section>

  <details class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
    <summary class="cursor-pointer font-semibold text-slate-900 dark:text-white">
      Edit the rules
    </summary>
    <div class="mt-4">
      <RuleEditor {rules} onChange={onRules} />
    </div>
  </details>
</div>
