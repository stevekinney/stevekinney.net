<script lang="ts">
  import { Copy } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { fieldClasses, labelClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { formatRewrite, isComplete, startRewrite } from './rewrite';

  type Props = {
    /** The line being rewritten. The helper starts over whenever it changes. */
    line: string;
    lineNumber: number;
    onCopy: (text: string) => Promise<boolean>;
  };

  const { line, lineNumber, onCopy }: Props = $props();

  let parts = $state(startRewrite(''));
  let message = $state<string | null>(null);

  $effect.pre(() => {
    parts = startRewrite(line);
    message = null;
  });

  const preview = $derived(formatRewrite(parts));

  const copy = async (): Promise<void> => {
    message = (await onCopy(preview))
      ? 'Rewrite copied.'
      : 'Couldn’t reach the clipboard. Select the text above and copy it.';
  };
</script>

<section
  aria-labelledby="rewrite-heading"
  data-testid="rewrite-helper"
  class="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
>
  <div class="space-y-1">
    <h4 id="rewrite-heading" class="text-base font-bold text-slate-900 dark:text-white">
      Rewrite line {lineNumber} as When / do / verify
    </h4>
    <p class="text-sm text-slate-600 dark:text-slate-300">
      The outline’s template for an instruction that changes a decision: when $trigger, do $action,
      then verify $result.
    </p>
  </div>
  <div class="grid gap-3 sm:grid-cols-3">
    <label class="space-y-1.5">
      <span class={labelClasses}>When</span>
      <input class={fieldClasses} bind:value={parts.trigger} placeholder="editing billing code" />
    </label>
    <label class="space-y-1.5">
      <span class={labelClasses}>Do</span>
      <input class={fieldClasses} bind:value={parts.action} />
    </label>
    <label class="space-y-1.5">
      <span class={labelClasses}>Then verify</span>
      <input class={fieldClasses} bind:value={parts.result} placeholder="that `pnpm test` passes" />
    </label>
  </div>
  <p
    data-testid="rewrite-preview"
    class="rounded-md bg-slate-50 px-3 py-2 [overflow-wrap:anywhere] text-slate-900 dark:bg-slate-800/60 dark:text-white"
  >
    <InlineCode text={preview} />
  </p>
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="secondary" size="small" icon={Copy} onclick={copy}>Copy rewrite</Button>
    <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
      {#if message}{message}{:else if !isComplete(parts)}Fill in the blanks marked ____.{/if}
    </p>
  </div>
</section>
