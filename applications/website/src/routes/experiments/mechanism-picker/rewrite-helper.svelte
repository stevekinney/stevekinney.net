<script lang="ts">
  import InlineCode from './inline-code.svelte';
  import { formatRewrite, startRewrite } from './rewrite';

  type Props = {
    /** The line being rewritten. The helper starts over whenever it changes. */
    line: string;
  };

  const { line }: Props = $props();

  // The line becomes the action, and starts over whenever the line changes.
  let action = $derived(startRewrite(line).action);
  let trigger = $state('');
  let result = $state('');

  const preview = $derived(formatRewrite({ trigger, action, result }));

  const fieldClasses =
    'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus-visible:ring-primary-400';
  const labelClasses = 'block text-sm font-semibold text-slate-700 dark:text-slate-200';
</script>

<div data-testid="rewrite-helper" class="space-y-3 pt-2">
  <p class="text-sm text-slate-600 dark:text-slate-300">
    An instruction earns its place when it changes a decision: when $trigger, do $action, then
    verify $result. Fill in the blanks, or delete the line.
  </p>
  <div class="grid gap-3 sm:grid-cols-3">
    <label class="space-y-1.5">
      <span class={labelClasses}>When</span>
      <input class={fieldClasses} bind:value={trigger} placeholder="editing billing code" />
    </label>
    <label class="space-y-1.5">
      <span class={labelClasses}>Do</span>
      <input class={fieldClasses} bind:value={action} />
    </label>
    <label class="space-y-1.5">
      <span class={labelClasses}>Then verify</span>
      <input class={fieldClasses} bind:value={result} placeholder="that `pnpm test` passes" />
    </label>
  </div>
  <p
    data-testid="rewrite-preview"
    class="rounded-md bg-white px-3 py-2 [overflow-wrap:anywhere] text-slate-900 dark:bg-slate-900 dark:text-white"
  >
    <InlineCode text={preview} />
  </p>
</div>
