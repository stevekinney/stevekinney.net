<script lang="ts">
  import { Copy, Download } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { installFolders, targetLabels } from './document';
  import type { Target } from './document';

  type Props = {
    target: Target;
    fileName: string;
    text: string;
    errors: number;
    disabled: boolean;
    onDownload: () => void;
    onCopy: () => Promise<boolean>;
  };

  const { target, fileName, text, errors, disabled, onDownload, onCopy }: Props = $props();

  let copyStatus = $state<string | null>(null);

  const copy = async (): Promise<void> => {
    copyStatus = (await onCopy())
      ? `Copied ${fileName}.`
      : 'Couldn’t copy. Select the text below and copy it instead.';
  };
</script>

<section aria-labelledby="export-heading" class="max-w-4xl space-y-4">
  <div class="space-y-1">
    <h2 id="export-heading" class="text-xl font-bold text-slate-900 dark:text-white">Export</h2>
    <p class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
      Save it as <code>{installFolders[target]}{fileName}</code> in your project{#if target === 'claude'},
        or in <code>~/.claude/agents/</code> to use it in every project{/if}.
      {#if errors > 0}
        It still has {errors === 1 ? 'an error' : `${errors} errors`}, listed in the checks above,
        but you can export it anyway.
      {/if}
    </p>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <Button icon={Download} class="max-w-full" {disabled} onclick={onDownload}>
      <span class="[overflow-wrap:anywhere]">Download {fileName}</span>
    </Button>
    <Button variant="secondary" icon={Copy} {disabled} onclick={copy}>Copy</Button>
    <p
      class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      aria-live="polite"
    >
      {copyStatus ?? ''}
    </p>
  </div>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    role="region"
    tabindex="0"
    aria-label="Preview of {fileName} for {targetLabels[target]}"
    class="focus-visible:outline-primary-600 relative max-h-[36rem] overflow-y-auto rounded-md border border-slate-300 bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-slate-600 dark:bg-slate-900"
  >
    <pre
      data-testid="export-preview"
      class="p-4 font-mono text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:text-slate-100">{text}</pre>
  </div>
</section>
