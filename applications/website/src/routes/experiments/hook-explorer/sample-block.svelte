<script lang="ts">
  import { Copy } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { copyText } from '$lib/experiments/copy-text';

  type Props = {
    /** Names the sample for the copy button and its status. */
    label: string;
    text: string;
    disabled: boolean;
    testId?: string;
  };

  const { label, text, disabled, testId }: Props = $props();

  let status = $state<string | null>(null);

  const copy = async (): Promise<void> => {
    status = (await copyText(text))
      ? 'Copied.'
      : 'Couldn’t copy. Select the text and copy it instead.';
  };
</script>

<div class="space-y-2">
  <div class="flex flex-wrap items-center gap-3">
    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
    <Button variant="secondary" size="small" icon={Copy} {disabled} onclick={copy}>Copy</Button>
    <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">{status ?? ''}</p>
  </div>
  <pre
    data-testid={testId}
    class="rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm [overflow-wrap:anywhere] whitespace-pre-wrap text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">{text}</pre>
</div>
