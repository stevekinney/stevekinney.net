<script lang="ts">
  import { Copy, Download } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { copyText } from '$lib/experiments/copy-text';
  import { downloadText } from '$lib/experiments/download-text';

  import type { ExportFile } from './skill-document';

  type Props = {
    file: ExportFile;
    disabled?: boolean;
  };

  const { file, disabled = false }: Props = $props();

  let status = $state<string | null>(null);

  const copy = async (): Promise<void> => {
    status = (await copyText(file.text))
      ? `Copied ${file.fileName}.`
      : 'Couldn’t reach the clipboard. Select the text below and copy it instead.';
  };
</script>

<div
  class="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
  data-testid="export-file"
>
  <div
    class="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 dark:bg-slate-800/60"
  >
    <div class="min-w-0">
      <p
        class="font-mono text-sm font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-white"
      >
        {file.path}
      </p>
      {#if status}
        <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{status}</p>
      {/if}
    </div>
    <div class="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="small"
        icon={Download}
        {disabled}
        onclick={() => downloadText(file.fileName, file.text, file.mediaType)}
      >
        Download <span class="sr-only">{file.fileName}</span>
      </Button>
      <Button variant="secondary" size="small" icon={Copy} {disabled} onclick={copy}>
        Copy <span class="sr-only">{file.fileName}</span>
      </Button>
    </div>
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    role="region"
    tabindex="0"
    aria-label="{file.path} preview"
    class="focus-visible:outline-primary-600 relative max-h-[28rem] overflow-y-auto border-t border-slate-200 bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 dark:border-slate-700 dark:bg-slate-900"
  >
    <pre
      data-testid="export-preview"
      class="p-4 font-mono text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:text-slate-100">{file.text}</pre>
  </div>
</div>
