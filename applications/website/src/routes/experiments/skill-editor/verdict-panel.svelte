<script lang="ts">
  import { CircleAlert, CircleCheck } from '@lucide/svelte';

  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import { targetNames } from './skill-document';
  import type { SkillIssue, Target } from './skill-document';

  type Props = {
    target: Target;
    issues: readonly SkillIssue[];
    /** What this target's export leaves out. */
    notWritten: readonly string[];
    /** Frontmatter keys neither tool reads, written back unchanged. */
    kept: readonly string[];
  };

  const { target, issues, notWritten, kept }: Props = $props();

  const errors = $derived(issues.filter((issue) => issue.severity === 'error').length);
  const warnings = $derived(issues.length - errors);

  const plural = (count: number, word: string): string =>
    `${count.toLocaleString('en-US')} ${word}${count === 1 ? '' : 's'}`;

  const headline = $derived(
    errors > 0 ? `${plural(errors, 'error')} to fix` : `Ready for ${targetNames[target]}`,
  );

  const summary = $derived.by(() => {
    const checked = `Checked against ${targetNames[target]}’s rules`;
    if (errors > 0) {
      return `${checked}${warnings > 0 ? `, with ${plural(warnings, 'warning')} too` : ''}. You can still export it.`;
    }

    return warnings > 0
      ? `${checked}, with ${plural(warnings, 'warning')} worth a look.`
      : `${checked}: no errors or warnings.`;
  });

  /** Keys and file names as code: `a`, `b`, and `c`. */
  const asCode = (items: readonly string[]): string =>
    items.map((item) => `\`${item}\``).join(', ');
</script>

<section
  aria-labelledby="verdict-heading"
  class={[
    'space-y-3 rounded-lg border p-5',
    errors > 0
      ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
      : 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  ]}
>
  <div class="flex items-start gap-3">
    {#if errors > 0}
      <CircleAlert
        aria-hidden="true"
        class="mt-0.5 size-6 flex-none text-red-700 dark:text-red-400"
      />
    {:else}
      <CircleCheck
        aria-hidden="true"
        class="mt-0.5 size-6 flex-none text-emerald-700 dark:text-emerald-400"
      />
    {/if}
    <div class="min-w-0 space-y-1">
      <h2
        id="verdict-heading"
        data-testid="verdict"
        aria-live="polite"
        class="text-xl font-bold text-slate-900 dark:text-white"
      >
        {headline}
      </h2>
      <p class="text-sm text-slate-700 dark:text-slate-300">{summary}</p>
    </div>
  </div>

  {#if issues.length > 0}
    <ul class="space-y-1.5 text-sm" data-testid="verdict-issues">
      {#each issues as issue, index (index)}
        <li
          class={[
            '[overflow-wrap:anywhere]',
            issue.severity === 'error'
              ? 'text-red-800 dark:text-red-300'
              : 'text-amber-900 dark:text-amber-200',
          ]}
        >
          <span class="font-semibold">{issue.severity === 'error' ? 'Error' : 'Warning'}:</span>
          <CodeText text={issue.message} />
        </li>
      {/each}
    </ul>
  {/if}

  {#if notWritten.length > 0}
    <p
      class="text-sm [overflow-wrap:anywhere] text-slate-700 dark:text-slate-300"
      data-testid="not-written"
    >
      <span class="font-semibold">Not written for {targetNames[target]}:</span>
      <CodeText text={asCode(notWritten)} />. The editor keeps {notWritten.length === 1
        ? 'it'
        : 'them'} for when you switch back.
    </p>
  {/if}
  {#if kept.length > 0}
    <p
      class="text-sm [overflow-wrap:anywhere] text-slate-700 dark:text-slate-300"
      data-testid="kept-keys"
    >
      <span class="font-semibold">Kept as-is:</span>
      <CodeText text={asCode(kept)} />. Neither tool reads {kept.length === 1
        ? 'this key'
        : 'these keys'}, and both exports write {kept.length === 1 ? 'it' : 'them'} back unchanged.
    </p>
  {/if}
</section>
