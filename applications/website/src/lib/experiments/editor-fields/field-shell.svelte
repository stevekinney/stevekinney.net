<script lang="ts">
  import type { Snippet } from 'svelte';

  import CodeText from './code-text.svelte';
  import type { FieldIssue } from './field-issue';
  import { hintClasses, labelClasses } from './field-styles';

  type Props = {
    /** The control's id. The label, hint, and issues derive theirs from it. */
    id: string;
    label: string;
    /** The frontmatter key, shown beside the label so the field maps to the file. */
    fieldKey?: string;
    hint?: string;
    issues?: readonly FieldIssue[];
    /** A counter such as "212 / 1,024", shown at the end of the label row. */
    counter?: string | null;
    /** Whether the counter is over its limit. */
    counterOver?: boolean;
    /** Use a fieldset and legend for a group of controls, such as radio buttons. */
    group?: boolean;
    children: Snippet;
  };

  const {
    id,
    label,
    fieldKey,
    hint,
    issues = [],
    counter = null,
    counterOver = false,
    group = false,
    children,
  }: Props = $props();

  const issueClasses: Record<FieldIssue['severity'], string> = {
    error: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-800 dark:text-amber-300',
    tip: 'text-slate-600 dark:text-slate-300',
  };

  const issueLabels: Record<FieldIssue['severity'], string> = {
    error: 'Error',
    warning: 'Warning',
    tip: 'Tip',
  };
</script>

{#snippet heading()}
  <span class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
    <span class={labelClasses}>
      {label}
      {#if fieldKey && fieldKey.toLowerCase() !== label.toLowerCase()}
        <code class="ml-1 font-mono text-xs font-normal text-slate-500 dark:text-slate-400"
          >{fieldKey}</code
        >
      {/if}
    </span>
    {#if counter}
      <span
        class="text-xs tabular-nums {counterOver
          ? 'font-semibold text-red-700 dark:text-red-400'
          : 'text-slate-500 dark:text-slate-400'}">{counter}</span
      >
    {/if}
  </span>
{/snippet}

{#snippet notes()}
  {#if hint}
    <p id="{id}-hint" class={hintClasses}><CodeText text={hint} /></p>
  {/if}
  {#if issues.length > 0}
    <ul id="{id}-issues" class="space-y-1 text-sm">
      {#each issues as issue, index (index)}
        <li class="[overflow-wrap:anywhere] {issueClasses[issue.severity]}">
          <span class="font-semibold">{issueLabels[issue.severity]}:</span>
          <CodeText text={issue.message} />
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

{#if group}
  <fieldset class="min-w-0 space-y-1.5">
    <legend id="{id}-label" class="w-full">{@render heading()}</legend>
    {@render children()}
    {@render notes()}
  </fieldset>
{:else}
  <div class="min-w-0 space-y-1.5">
    <label id="{id}-label" for={id} class="block">{@render heading()}</label>
    {@render children()}
    {@render notes()}
  </div>
{/if}
