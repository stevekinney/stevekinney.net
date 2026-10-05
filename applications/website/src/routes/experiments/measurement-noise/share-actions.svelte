<script lang="ts">
  import { Copy, Download, Link } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { downloadText } from './download';

  type Props = {
    ready: boolean;
    /** Builds the link when it's copied, since it needs the page's address. */
    link: () => string;
    summary: () => string;
    csv: () => string;
    /** Whether the data on screen is the person's own, which the link leaves out. */
    ownData: boolean;
  };

  const { ready, link, summary, csv, ownData }: Props = $props();

  let message = $state<string | null>(null);
  let fallbackText = $state<string | null>(null);
  let fallbackLabel = $state('');
  let fallbackField = $state<HTMLTextAreaElement | undefined>();

  const copy = async (text: string, success: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      fallbackText = null;
      message = success;
    } catch {
      // The clipboard can reject, such as without permission or outside a secure page.
      fallbackText = text;
      fallbackLabel = label;
      message =
        'Couldn’t reach the clipboard. Press ⌘C on a Mac, or Ctrl+C, to copy the selected text.';
      queueMicrotask(() => fallbackField?.select());
    }
  };
</script>

<div class="space-y-3">
  <div class="flex flex-wrap gap-3">
    <Button
      variant="secondary"
      size="small"
      icon={Link}
      disabled={!ready}
      onclick={() =>
        copy(
          link(),
          ownData
            ? 'Link copied. It holds your settings, not your data: whoever opens it sees the default preset.'
            : 'Link copied. It holds the preset and every setting.',
          'Link',
        )}
    >
      Copy link
    </Button>
    <Button
      variant="secondary"
      size="small"
      icon={Copy}
      disabled={!ready}
      onclick={() => copy(summary(), 'Summary copied as Markdown.', 'Summary')}
    >
      Copy summary
    </Button>
    <Button
      variant="secondary"
      size="small"
      icon={Download}
      disabled={!ready}
      onclick={() => downloadText('outcome-table.csv', csv(), 'text/csv')}
    >
      Export the outcome table
    </Button>
  </div>
  <p
    class="min-h-5 text-sm text-slate-600 dark:text-slate-300"
    aria-live="polite"
    data-testid="share-message"
  >
    {message}
  </p>
  {#if fallbackText !== null}
    <label class="block text-sm text-slate-600 dark:text-slate-300">
      <span class="sr-only">{fallbackLabel} to copy</span>
      <textarea
        bind:this={fallbackField}
        readonly
        rows="6"
        value={fallbackText}
        onfocus={(event) => event.currentTarget.select()}
        class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      ></textarea>
    </label>
  {/if}
</div>
