<script lang="ts">
  import { describedBy } from './described-by';
  import FieldShell from './field-shell.svelte';
  import { hasFieldError } from './field-issue';
  import type { FieldIssue } from './field-issue';
  import { controlClasses } from './field-styles';

  type Props = {
    id: string;
    label: string;
    fieldKey?: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    issues?: readonly FieldIssue[];
    placeholder?: string;
    /** Characters allowed before the counter turns red. Shows a counter when set. */
    limit?: number;
    /** A text area instead of a single line, with this many rows. */
    rows?: number;
    monospace?: boolean;
    disabled?: boolean;
    /** Suggestions offered as the person types, such as model aliases. */
    suggestions?: readonly string[];
  };

  const {
    id,
    label,
    fieldKey,
    value,
    onChange,
    hint,
    issues = [],
    placeholder,
    limit,
    rows,
    monospace = false,
    disabled = false,
    suggestions = [],
  }: Props = $props();

  const counter = $derived(
    limit === undefined
      ? null
      : `${value.length.toLocaleString('en-US')} / ${limit.toLocaleString('en-US')}`,
  );
  const classes = $derived(`${controlClasses} ${monospace ? 'font-mono' : ''}`);
</script>

<FieldShell
  {id}
  {label}
  {fieldKey}
  {hint}
  {issues}
  {counter}
  counterOver={limit !== undefined && value.length > limit}
>
  {#if rows}
    <textarea
      {id}
      {value}
      {rows}
      {placeholder}
      {disabled}
      spellcheck={!monospace}
      aria-invalid={hasFieldError(issues) || undefined}
      aria-describedby={describedBy(id, hint, issues)}
      oninput={(event) => onChange(event.currentTarget.value)}
      class="{classes} resize-y"></textarea>
  {:else}
    <input
      {id}
      type="text"
      {value}
      {placeholder}
      {disabled}
      autocomplete="off"
      spellcheck={!monospace}
      list={suggestions.length > 0 ? `${id}-suggestions` : undefined}
      aria-invalid={hasFieldError(issues) || undefined}
      aria-describedby={describedBy(id, hint, issues)}
      oninput={(event) => onChange(event.currentTarget.value)}
      class={classes}
    />
    {#if suggestions.length > 0}
      <datalist id="{id}-suggestions">
        {#each suggestions as suggestion (suggestion)}
          <option value={suggestion}></option>
        {/each}
      </datalist>
    {/if}
  {/if}
</FieldShell>
