<script lang="ts">
  import { CircleAlert, CircleCheck, TriangleAlert } from '@lucide/svelte';

  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import type { WorkflowCheck } from './workflow-model';

  type Props = {
    checks: readonly WorkflowCheck[];
    /** True while an edit hasn't been checked yet. */
    checking: boolean;
    onReveal: (line: number) => void;
  };

  const { checks, checking, onReveal }: Props = $props();

  const errors = $derived(checks.filter((check) => check.severity === 'error').length);
  const warnings = $derived(checks.length - errors);

  const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? '' : 's'}`;

  const headline = $derived(
    errors > 0
      ? `${plural(errors, 'error')} to fix`
      : warnings > 0
        ? `Ready to run, with ${plural(warnings, 'warning')}`
        : 'Ready to run',
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
  aria-labelledby="checks-heading"
  class="space-y-3 rounded-lg border p-4 sm:p-5 {panelClasses}"
>
  <h2 id="checks-heading" class="sr-only">Checks</h2>
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
          Claude Code would refuse this script or stop partway through it.
        {:else if warnings > 0}
          Claude Code will run it, but these are worth a look first.
        {:else}
          No errors or warnings.
        {/if}
      </p>
    </div>
  </div>
  {#if checks.length > 0}
    <ul data-testid="checks" class="space-y-1.5 text-sm">
      {#each checks as check, index (index)}
        <li
          class={[
            'flex flex-wrap items-baseline gap-x-2 [overflow-wrap:anywhere]',
            check.severity === 'error'
              ? 'text-red-800 dark:text-red-300'
              : 'text-amber-900 dark:text-amber-200',
          ]}
        >
          <span class="min-w-0 flex-1">
            <span class="font-semibold">{check.severity === 'error' ? 'Error' : 'Warning'}:</span>
            <CodeText text={check.message} />
          </span>
          {#if check.line !== null}
            {@const line = check.line}
            <button
              type="button"
              onclick={() => onReveal(line)}
              class="focus-visible:outline-primary-600 cursor-pointer text-xs whitespace-nowrap underline underline-offset-2 focus-visible:outline-2"
            >
              Show line {line}
            </button>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>
