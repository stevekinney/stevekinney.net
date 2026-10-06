<script lang="ts">
  import { ChevronDown, FileUp, FolderUp } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  import Button from '$lib/components/button';
  import { merge } from '$merge';

  import { collectDroppedFiles, toSourceFiles } from './dropped-files';
  import type { FolderOptions, SourceFile } from './dropped-files';

  type Props = FolderOptions & {
    /** The zone's heading, such as "Drop Claude Code session files here". */
    title: string;
    /** The heading while files are dragged over the zone. */
    draggingTitle?: string;
    /** Receives what was dropped or picked. Walking a dropped folder takes a moment, so it's a promise. */
    onFiles: (files: Promise<SourceFile[]>) => void;
    /** Disables the controls and shows a spinner, such as while files are read. */
    busy?: boolean;
    /** Announced while busy, such as "Reading file 2 of 5…". */
    progress?: string | null;
    /** Announced once reading finishes, such as "Read 3 files." */
    status?: string | null;
    /** File types for the file picker, such as ".jsonl" or ".md,.json". */
    accept?: string;
    /** Also offer a folder picker. Dropping a folder works either way. */
    folders?: boolean;
    /**
     * Read files dropped anywhere on the page, not only on this zone. Use it
     * only on a page with a single drop zone.
     */
    captureWindowDrops?: boolean;
    fileButtonLabel?: string;
    folderButtonLabel?: string;
    /** Guidance below the controls, such as where these files live on disk. */
    children?: Snippet;
    /** Extra classes for the zone, such as `h-full` to match the height of a column beside it. */
    class?: string;
  };

  const {
    title,
    draggingTitle = 'Drop to read these files',
    onFiles,
    busy = false,
    progress = null,
    status = null,
    accept,
    folders = false,
    captureWindowDrops = false,
    fileButtonLabel = 'Choose files',
    folderButtonLabel = 'Choose a folder',
    enterFolder,
    keepFile,
    children,
    class: className = '',
  }: Props = $props();

  const id = $props.id();

  let filePicker: HTMLInputElement | undefined = $state();
  let folderPicker: HTMLInputElement | undefined = $state();
  let zoneDragDepth = $state(0);
  let pageDragDepth = $state(0);

  // The page is prerendered, so these controls exist before anything can
  // handle a click or a chosen file. They stay disabled until it can.
  let interactive = $state(false);
  onMount(() => {
    interactive = true;
  });

  // Starts closed. Opening it is remembered, in one preference for every experiment. It's read after mount, so the prerendered HTML and the
  // first client render agree, and storage can be missing or blocked.
  const COLLAPSED_KEY = 'experiments:file-drop-zone-collapsed';
  let collapsed = $state(true);
  onMount(() => {
    try {
      collapsed = localStorage.getItem(COLLAPSED_KEY) !== 'false';
    } catch {
      // Storage is unavailable, so the zone starts closed.
    }
  });

  const toggleCollapsed = (): void => {
    collapsed = !collapsed;
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // The choice still holds until the page closes.
    }
  };

  const hasStatus = $derived(busy ? Boolean(progress) : Boolean(status));

  const dragging = $derived(zoneDragDepth > 0 || (captureWindowDrops && pageDragDepth > 0));

  const carriesFiles = (event: DragEvent): boolean =>
    event.dataTransfer?.types.includes('Files') ?? false;

  const insideAnyZone = (event: DragEvent): boolean =>
    event.target instanceof Element && event.target.closest('[data-file-drop-zone]') !== null;

  const read = (dataTransfer: DataTransfer): void => {
    zoneDragDepth = 0;
    pageDragDepth = 0;

    if (busy || !interactive) return;

    // Must start before the drop handler returns, while the drop's files are readable.
    onFiles(collectDroppedFiles(dataTransfer, { enterFolder, keepFile }));
  };

  // A file dropped where nothing handles it would open in the browser and
  // replace the page, so every file drop on the page is claimed here.
  const handleWindowDragOver = (event: DragEvent): void => {
    if (!carriesFiles(event)) return;

    event.preventDefault();
    if (event.dataTransfer && !insideAnyZone(event)) {
      event.dataTransfer.dropEffect = captureWindowDrops ? 'copy' : 'none';
    }
  };

  const handleWindowDrop = (event: DragEvent): void => {
    if (!carriesFiles(event)) return;

    event.preventDefault();
    pageDragDepth = 0;

    if (captureWindowDrops && event.dataTransfer) read(event.dataTransfer);
  };

  const handleZoneDragOver = (event: DragEvent): void => {
    if (!carriesFiles(event)) return;

    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  };

  const handleZoneDrop = (event: DragEvent): void => {
    // With window capture on, the drop bubbles to the window handler instead.
    if (captureWindowDrops || !carriesFiles(event) || !event.dataTransfer) return;

    event.preventDefault();
    read(event.dataTransfer);
  };

  const handlePicked = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const { files } = event.currentTarget;
    if (files && files.length > 0) {
      onFiles(Promise.resolve(toSourceFiles(files, { enterFolder, keepFile })));
    }

    // Choosing the same files again should read them again.
    event.currentTarget.value = '';
  };
</script>

<svelte:window
  ondragenter={(event) => {
    if (carriesFiles(event)) pageDragDepth += 1;
  }}
  ondragleave={(event) => {
    if (carriesFiles(event)) pageDragDepth = Math.max(0, pageDragDepth - 1);
  }}
  ondragover={handleWindowDragOver}
  ondrop={handleWindowDrop}
/>

<div
  data-file-drop-zone
  role="group"
  aria-labelledby="{id}-title"
  ondragenter={(event) => {
    if (carriesFiles(event)) zoneDragDepth += 1;
  }}
  ondragleave={(event) => {
    if (carriesFiles(event)) zoneDragDepth = Math.max(0, zoneDragDepth - 1);
  }}
  ondragover={handleZoneDragOver}
  ondrop={handleZoneDrop}
  class={merge(
    'relative flex flex-col justify-center rounded-lg border-2 border-dashed transition-colors',
    collapsed ? 'gap-0 px-6 py-4' : 'gap-4 p-6',
    dragging
      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40'
      : 'border-slate-300 dark:border-slate-600',
    className,
  )}
>
  <div class="flex items-start gap-3">
    <FileUp
      aria-hidden="true"
      class="text-primary-600 dark:text-primary-400 mt-0.5 size-6 flex-none"
    />
    <div class="space-y-1">
      <p id="{id}-title" class="font-semibold text-slate-900 dark:text-white">
        {dragging ? draggingTitle : title}
      </p>
      <p class={['text-sm text-slate-600 dark:text-slate-300', collapsed && 'hidden']}>
        Files are read in your browser. Nothing is uploaded.
      </p>
    </div>
    <button
      type="button"
      onclick={toggleCollapsed}
      disabled={!interactive}
      aria-expanded={!collapsed}
      aria-controls="{id}-body"
      aria-label={collapsed ? 'Show file controls' : 'Hide file controls'}
      class="focus-visible:outline-primary-600 mt-0.5 ml-auto flex size-6 flex-none cursor-pointer items-center justify-center rounded text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-300 dark:hover:text-white"
    >
      <ChevronDown
        aria-hidden="true"
        class={['size-5 transition-transform', collapsed && '-rotate-90']}
      />
    </button>
  </div>

  <div class={['flex flex-wrap items-center gap-3', collapsed && hasStatus && 'mt-3']}>
    <div id="{id}-body" class={collapsed ? 'hidden' : 'contents'}>
      <Button
        variant="secondary"
        loading={busy}
        disabled={!interactive || busy}
        onclick={() => filePicker?.click()}
        aria-describedby={children ? `${id}-guidance` : undefined}
      >
        {fileButtonLabel}
      </Button>
      {#if folders}
        <Button
          variant="secondary"
          icon={FolderUp}
          disabled={!interactive || busy}
          onclick={() => folderPicker?.click()}
          aria-describedby={children ? `${id}-guidance` : undefined}
        >
          {folderButtonLabel}
        </Button>
      {/if}
    </div>
    <p
      class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      aria-live="polite"
    >
      {#if busy && progress}
        {progress}
      {:else if !busy && status}
        {status}
      {/if}
    </p>
  </div>

  <input
    bind:this={filePicker}
    type="file"
    {accept}
    multiple
    class="sr-only"
    tabindex="-1"
    aria-hidden="true"
    onchange={handlePicked}
  />
  {#if folders}
    <input
      bind:this={folderPicker}
      type="file"
      webkitdirectory
      multiple
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      onchange={handlePicked}
    />
  {/if}

  {#if children}
    <div
      id="{id}-guidance"
      class={['text-sm text-slate-500 dark:text-slate-400', collapsed && 'hidden']}
    >
      {@render children()}
    </div>
  {/if}
</div>
