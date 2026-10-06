<script lang="ts">
  import { onMount } from 'svelte';

  import type { MarkdownEditorView } from './markdown-editor-view';

  type Props = {
    /** The Markdown source. Bind it to follow edits. */
    value: string;
    /** The id of the visible label that names the editor. */
    labelledBy: string;
    /** The id of the hint that describes the editor, if any. */
    describedBy?: string;
    placeholder?: string;
    /** Rows for the plain text area shown before the editor loads. */
    rows?: number;
  };

  let { value = $bindable(), labelledBy, describedBy, placeholder, rows = 16 }: Props = $props();

  let host: HTMLDivElement | undefined = $state();
  let view = $state.raw<MarkdownEditorView | null>(null);

  onMount(() => {
    let cancelled = false;

    // CodeMirror is several hundred kilobytes, so it loads after the page is
    // interactive. Until then the text area below edits the same value.
    void import('./markdown-editor-view').then(({ createMarkdownEditorView }) => {
      if (cancelled || !host) return;

      view = createMarkdownEditorView({
        parent: host,
        value,
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

<div
  class="markdown-editor overflow-hidden rounded-md border border-slate-300 dark:border-slate-600"
>
  {#if !view}
    <textarea
      bind:value
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      {placeholder}
      {rows}
      spellcheck="false"
      class="block w-full resize-y bg-[var(--markdown-editor-background)] px-3 py-3 font-mono text-sm leading-relaxed text-[var(--markdown-editor-text)] outline-none"
    ></textarea>
  {/if}
  <div bind:this={host} class:hidden={!view}></div>
</div>

<style>
  .markdown-editor {
    --markdown-editor-background: #ffffff;
    --markdown-editor-text: #0f172a;
    --markdown-editor-muted: #64748b;
    --markdown-editor-heading: #0f172a;
    --markdown-editor-link: #1d4ed8;
    --markdown-editor-code: #9d174d;
    --markdown-editor-tag: #6d28d9;
    --markdown-editor-selection: #bfdbfe;
  }

  .markdown-editor:focus-within {
    outline: 2px solid var(--color-primary-600, #2563eb);
    outline-offset: 2px;
  }

  @media (prefers-color-scheme: dark) {
    .markdown-editor {
      --markdown-editor-background: #1e293b;
      --markdown-editor-text: #f1f5f9;
      --markdown-editor-muted: #94a3b8;
      --markdown-editor-heading: #ffffff;
      --markdown-editor-link: #93c5fd;
      --markdown-editor-code: #f9a8d4;
      --markdown-editor-tag: #c4b5fd;
      --markdown-editor-selection: #1e40af;
    }
  }
</style>
