<script lang="ts">
  import CodeText from '$lib/experiments/editor-fields/code-text.svelte';

  import type { FieldNode, FieldValue } from './schema-tree';

  type Props = {
    fields: FieldNode[];
    /** Short notes keyed by field name, such as what `tool_input` holds. */
    notes?: Record<string, string>;
    testId?: string;
  };

  const { fields, notes = {}, testId }: Props = $props();

  const show = (value: FieldValue): string =>
    typeof value === 'string' ? value : JSON.stringify(value);
</script>

{#snippet rows(list: FieldNode[], nested: boolean)}
  <ul
    class={nested
      ? 'mt-2 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-700'
      : 'space-y-2'}
    data-testid={nested ? undefined : testId}
  >
    {#each list as field (field.name)}
      <li class="min-w-0" data-field={field.name}>
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <code
            class="font-mono text-sm font-semibold [overflow-wrap:anywhere] text-slate-900 dark:text-slate-100"
            >{field.name}</code
          >
          <span class="text-xs text-slate-500 dark:text-slate-400">{field.type}</span>
          <span
            class="rounded px-1.5 text-xs font-medium {field.required
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}"
            >{field.required ? 'required' : 'optional'}</span
          >
        </div>
        {#if field.values}
          <p class="mt-0.5 text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300">
            {field.values.length === 1 ? 'Always' : 'One of'}
            {#each field.values as value, index (index)}<code class="font-mono text-[0.9em]"
                >{show(value)}</code
              >{index < field.values.length - 1 ? ', ' : ''}{/each}
          </p>
        {/if}
        {#if notes[field.name]}
          <p class="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            <CodeText text={notes[field.name] ?? ''} />
          </p>
        {/if}
        {#if field.children}
          {@render rows(field.children, true)}
          {#if field.strict}
            <p class="mt-1 pl-3 text-xs text-slate-500 dark:text-slate-400">
              No other keys allowed.
            </p>
          {/if}
        {/if}
        {#if field.variants}
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            One of {field.variants.length} shapes:
          </p>
          <div class="mt-1 space-y-2 border-l border-slate-200 pl-3 dark:border-slate-700">
            {#each field.variants as variant (variant.label)}
              <div>
                <p
                  class="font-mono text-xs font-semibold [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200"
                >
                  {variant.label}
                </p>
                {@render rows(variant.fields, true)}
              </div>
            {/each}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{@render rows(fields, false)}
