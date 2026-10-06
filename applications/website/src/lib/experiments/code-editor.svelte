<script lang="ts">
  import { onMount } from 'svelte';

  import type { CodeEditorLanguage, CodeEditorView } from './code-editor-view';

  type Props = {
    /** The source text. Bind it to follow edits. */
    value: string;
    language: CodeEditorLanguage;
    /** The id of the visible label that names the editor. */
    labelledBy: string;
    /** The id of the hint that describes the editor, if any. */
    describedBy?: string;
    placeholder?: string;
    /** Rows for the plain text area shown before the editor loads. */
    rows?: number;
  };

  let {
    value = $bindable(),
    language,
    labelledBy,
    describedBy,
    placeholder,
    rows = 16,
  }: Props = $props();

  let host: HTMLDivElement | undefined = $state();
  let textarea: HTMLTextAreaElement | undefined = $state();
  let view = $state.raw<CodeEditorView | null>(null);

  /** Selects a 1-based line and scrolls it into view, such as a diagram node's source line. */
  export const revealLine = (line: number): void => {
    if (view) {
      view.revealLine(line);
      return;
    }

    // Before CodeMirror loads, select the line in the plain text area.
    if (!textarea) return;
    const lines = value.split('\n');
    const index = Math.min(Math.max(1, line), lines.length) - 1;
    const start = lines.slice(0, index).reduce((sum, text) => sum + text.length + 1, 0);
    textarea.focus();
    textarea.setSelectionRange(start, start + (lines[index]?.length ?? 0));
  };

  onMount(() => {
    let cancelled = false;

    // CodeMirror is several hundred kilobytes, so it loads after the page is
    // interactive. Until then the text area below edits the same value.
    void import('./code-editor-view').then(({ createCodeEditorView }) => {
      if (cancelled || !host) return;

      view = createCodeEditorView({
        parent: host,
        value,
        language,
        labelledBy,
        describedBy,
        placeholder,
        onChange: (next) => {
          value = next;
        },
      });
    });

    return () => {
      cancelled = true;
      view?.destroy();
    };
  });

  // A value set from outside, such as a loaded file, replaces the editor's text.
  $effect(() => {
    const next = value;
    if (view && view.getValue() !== next) view.setValue(next);
  });
</script>

<div class="code-editor overflow-hidden rounded-md border border-slate-300 dark:border-slate-600">
  {#if !view}
    <textarea
      bind:this={textarea}
      bind:value
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      {placeholder}
      {rows}
      spellcheck="false"
      class="block w-full resize-y bg-[var(--code-editor-background)] px-3 py-3 font-mono text-sm leading-relaxed text-[var(--code-editor-text)] outline-none"
    ></textarea>
  {/if}
  <div bind:this={host} class:hidden={!view}></div>
</div>

<style>
  .code-editor {
    --code-editor-background: #ffffff;
    --code-editor-text: #0f172a;
    --code-editor-muted: #64748b;
    --code-editor-heading: #0f172a;
    --code-editor-link: #1d4ed8;
    --code-editor-keyword: #6d28d9;
    --code-editor-string: #9d174d;
    --code-editor-number: #b45309;
    --code-editor-function: #1d4ed8;
    --code-editor-property: #0f766e;
    --code-editor-selection: #bfdbfe;
  }

  .code-editor:focus-within {
    outline: 2px solid var(--color-primary-600, #2563eb);
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .code-editor {
      --code-editor-background: #1e293b;
      --code-editor-text: #f1f5f9;
      --code-editor-muted: #94a3b8;
      --code-editor-heading: #ffffff;
      --code-editor-link: #93c5fd;
      --code-editor-keyword: #c4b5fd;
      --code-editor-string: #f9a8d4;
      --code-editor-number: #fcd34d;
      --code-editor-function: #93c5fd;
      --code-editor-property: #5eead4;
      --code-editor-selection: #1e40af;
    }
  }
</style>
