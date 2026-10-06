<script lang="ts">
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';

  import { enterNoteFolder, keepNotePath } from './read-notes';

  type Props = {
    includedTypes: string;
    busy: boolean;
    progress: string | null;
    status: string | null;
    error: string | null;
    onFiles: (files: Promise<SourceFile[]>) => void;
    /** Called when the person finishes editing the included types. */
    onTypesCommit: () => void;
  };

  let {
    includedTypes = $bindable(),
    busy,
    progress,
    status,
    error,
    onFiles,
    onTypesCommit,
  }: Props = $props();
</script>

<section aria-labelledby="loader-heading" class="space-y-4">
  <div class="space-y-1">
    <h2 id="loader-heading" class="text-xl font-bold text-slate-900 dark:text-white">
      Open a folder of notes
    </h2>
    <p class="max-w-prose text-sm text-slate-600 dark:text-slate-300">
      Load your own library to browse it the same way. Choose a folder or drop one on the page, or
      choose several <code class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">.md</code>
      files. The notes are read in your browser by the same code that built the bundled library, and they
      replace it until you return. Nothing is sent anywhere.
    </p>
  </div>

  <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <FileDropZone
      title="Drop a folder of notes here"
      draggingTitle="Drop to read these notes"
      accept=".md,.markdown,text/markdown"
      folders
      captureWindowDrops
      fileButtonLabel="Choose Markdown files"
      folderButtonLabel="Choose a folder"
      keepFile={keepNotePath}
      enterFolder={enterNoteFolder}
      {onFiles}
      {busy}
      {progress}
      {status}
    >
      Notes need frontmatter with a <code class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800"
        >type</code
      >
      to be included. Sections are found by their headings, such as TL;DR and When To Use It.
    </FileDropZone>

    <div class="space-y-2 text-sm">
      <label for="included-types" class="block font-medium text-slate-800 dark:text-slate-100">
        Included types
      </label>
      <input
        id="included-types"
        type="text"
        bind:value={includedTypes}
        onchange={onTypesCommit}
        autocomplete="off"
        spellcheck="false"
        aria-describedby="included-types-help"
        class="focus-visible:ring-primary-600 dark:focus-visible:ring-primary-400 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:ring-2 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      />
      <p id="included-types-help" class="text-slate-600 dark:text-slate-300">
        A comma list. A note whose frontmatter <code
          class="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">type</code
        > isn't on it is excluded, and the diagnostics say so.
      </p>
    </div>
  </div>

  {#if error}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
  {/if}
</section>
