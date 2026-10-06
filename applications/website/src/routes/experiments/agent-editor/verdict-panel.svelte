<script lang="ts">
  import { CircleAlert, CircleCheck, TriangleAlert } from '@lucide/svelte';

  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import { targetLabels } from './document';
  import type { Target } from './document';

  type Props = {
    target: Target;
    issues: readonly { severity: 'error' | 'warning'; message: string }[];
    /** True while an edit hasn't been checked yet. */
    checking: boolean;
  };

  const { target, issues, checking }: Props = $props();

  const errors = $derived(issues.filter((issue) => issue.severity === 'error').length);
  const warnings = $derived(issues.length - errors);

  const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? '' : 's'}`;

  const headline = $derived(
    errors > 0
      ? `${plural(errors, 'error')} to fix`
      : warnings > 0
        ? `Ready for ${targetLabels[target]}, with ${plural(warnings, 'warning')}`
        : `Ready for ${targetLabels[target]}`,
  );

  const panelClasses = $derived(
    errors > 0
      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
      : warnings > 0
        ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
        : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  );
</script>

<section
  aria-labelledby="verdict-heading"
  class="max-w-4xl space-y-3 rounded-lg border p-4 sm:p-5 {panelClasses}"
>
  <h2 id="verdict-heading" class="sr-only">Checks</h2>
  <div class="flex items-start gap-3">
    {#if errors > 0}
      <CircleAlert
        aria-hidden="true"
        class="mt-0.5 size-6 flex-none text-red-700 dark:text-red-400"
      />
    {:else if warnings > 0}
      <TriangleAlert
        aria-hidden="true"
        class="mt-0.5 size-6 flex-none text-amber-700 dark:text-amber-300"
      />
    {:else}
      <CircleCheck
        aria-hidden="true"
        class="mt-0.5 size-6 flex-none text-emerald-700 dark:text-emerald-400"
      />
    {/if}
    <div class="min-w-0 space-y-1">
      <p
        data-testid="verdict"
        aria-live="polite"
        class="text-xl font-bold text-slate-900 dark:text-white"
      >
        {headline}
      </p>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {#if checking}
          Checking your changes…
        {:else if errors > 0}
          {targetLabels[target]} may reject or skip this file. You can still export it.
        {:else}
          No errors or warnings.
        {/if}
      </p>
    </div>
  </div>
  {#if issues.length > 0}
    <ul data-testid="verdict-issues" class="space-y-1.5 text-sm">
      {#each issues as issue, index (index)}
        <li
          class="[overflow-wrap:anywhere] {issue.severity === 'error'
            ? 'text-red-800 dark:text-red-300'
            : 'text-amber-900 dark:text-amber-200'}"
        >
          <span class="font-semibold">{issue.severity === 'error' ? 'Error' : 'Warning'}:</span>
          <CodeText text={issue.message} />
        </li>
      {/each}
    </ul>
  {/if}
</section>
