<script lang="ts">
  import { describedBy } from './described-by';
  import FieldShell from './field-shell.svelte';
  import { hasFieldError } from './field-issue';
  import type { FieldIssue } from './field-issue';
  import { controlClasses } from './field-styles';

  type Option = { value: string; label?: string };

  type Props = {
    id: string;
    label: string;
    fieldKey?: string;
    /** The chosen value, or an empty string for "not set". */
    value: string;
    onChange: (value: string) => void;
    options: readonly Option[];
    /** What leaving the field out means, such as "Default (inherit)". */
    unsetLabel?: string;
    hint?: string;
    issues?: readonly FieldIssue[];
    disabled?: boolean;
  };

  const {
    id,
    label,
    fieldKey,
    value,
    onChange,
    options,
    unsetLabel = 'Not set',
    hint,
    issues = [],
    disabled = false,
  }: Props = $props();

  // A loaded file can hold a value the schema doesn't list. Keep it selectable
  // so the file round-trips and the issue under the field explains it.
  const known = $derived(value === '' || options.some((option) => option.value === value));
</script>

<FieldShell {id} {label} {fieldKey} {hint} {issues}>
  <select
    {id}
    {value}
    {disabled}
    aria-invalid={hasFieldError(issues) || undefined}
    aria-describedby={describedBy(id, hint, issues)}
    onchange={(event) => onChange(event.currentTarget.value)}
    class={controlClasses}
  >
    <option value="">{unsetLabel}</option>
    {#each options as option (option.value)}
      <option value={option.value}>{option.label ?? option.value}</option>
    {/each}
    {#if !known}
      <option {value}>{value}</option>
    {/if}
  </select>
</FieldShell>
