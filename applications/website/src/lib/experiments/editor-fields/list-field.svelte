<script lang="ts">
  import { X } from '@lucide/svelte';

  import { describedBy } from './described-by';
  import FieldShell from './field-shell.svelte';
  import { hasFieldError } from './field-issue';
  import type { FieldIssue } from './field-issue';
  import { controlClasses } from './field-styles';

  type Props = {
    id: string;
    label: string;
    fieldKey?: string;
    values: readonly string[];
    onChange: (values: string[]) => void;
    hint?: string;
    issues?: readonly FieldIssue[];
    placeholder?: string;
    /** Suggestions offered as the person types, such as tool names. */
    suggestions?: readonly string[];
    disabled?: boolean;
  };

  const {
    id,
    label,
    fieldKey,
    values,
    onChange,
    hint,
    issues = [],
    placeholder = 'Type and press Enter',
    suggestions = [],
    disabled = false,
  }: Props = $props();

  let draft = $state('');

  /**
   * Adds what's typed. A comma separates items, except inside parentheses, so a
   * permission rule such as `Bash(git diff:*)` stays one item.
   */
  const commit = (): void => {
    const items: string[] = [];
    let depth = 0;
    let current = '';

    for (const character of draft) {
      if (character === '(') depth += 1;
      if (character === ')') depth = Math.max(0, depth - 1);
      if (character === ',' && depth === 0) {
        items.push(current);
        current = '';
      } else {
        current += character;
      }
    }
    items.push(current);

    const added = items.map((item) => item.trim()).filter((item) => item.length > 0);
    if (added.length === 0) return;

    onChange([...values, ...added.filter((item) => !values.includes(item))]);
    draft = '';
  };
</script>

<FieldShell {id} {label} {fieldKey} {hint} {issues}>
  {#if values.length > 0}
    <ul class="flex flex-wrap gap-2" aria-label="{label}: {values.length} added">
      {#each values as item, index (item)}
        <li
          class="flex max-w-full items-center gap-1 rounded-md bg-slate-100 py-1 pr-1 pl-2 font-mono text-xs text-slate-800 dark:bg-slate-700 dark:text-slate-100"
        >
          <span class="[overflow-wrap:anywhere]">{item}</span>
          <button
            type="button"
            {disabled}
            aria-label="Remove {item}"
            onclick={() => onChange(values.filter((_, position) => position !== index))}
            class="focus-visible:outline-primary-600 shrink-0 cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
          >
            <X class="size-3.5" aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <input
    {id}
    type="text"
    bind:value={draft}
    {placeholder}
    {disabled}
    autocomplete="off"
    spellcheck="false"
    list={suggestions.length > 0 ? `${id}-suggestions` : undefined}
    aria-invalid={hasFieldError(issues) || undefined}
    aria-describedby={describedBy(id, hint, issues)}
    onkeydown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Backspace' && draft === '' && values.length > 0) {
        onChange(values.slice(0, -1));
      }
    }}
    onblur={commit}
    class="{controlClasses} font-mono"
  />
  {#if suggestions.length > 0}
    <datalist id="{id}-suggestions">
      {#each suggestions.filter((suggestion) => !values.includes(suggestion)) as suggestion (suggestion)}
        <option value={suggestion}></option>
      {/each}
    </datalist>
  {/if}
</FieldShell>
