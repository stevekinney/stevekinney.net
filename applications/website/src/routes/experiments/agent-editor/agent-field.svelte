<script lang="ts">
  import type { FieldIssue } from '$lib/experiments/editor-fields/field-issue';
  import ListField from '$lib/experiments/editor-fields/list-field.svelte';
  import SelectField from '$lib/experiments/editor-fields/select-field.svelte';
  import TextField from '$lib/experiments/editor-fields/text-field.svelte';

  import { toList } from './checks';
  import type { FieldDefinition } from './fields';

  type Props = {
    field: FieldDefinition;
    id: string;
    /** The value as it is in the document, which a loaded file may spell its own way. */
    value: unknown;
    onChange: (value: unknown) => void;
    issues: readonly FieldIssue[];
    options?: readonly string[];
    suggestions?: readonly string[];
    /** A structured field's text as typed, which may not parse yet. */
    draft?: string;
    onDraft?: (text: string) => void;
    disabled: boolean;
  };

  const {
    field,
    id,
    value,
    onChange,
    issues,
    options = [],
    suggestions = [],
    draft = '',
    onDraft,
    disabled,
  }: Props = $props();

  const text = $derived(
    typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value),
  );

  // Claude Code reads `"true"` and `"false"` as booleans too. Show them as
  // such, and only write a real boolean once the person picks one.
  const booleanText = $derived(
    value === true || value === 'true'
      ? 'true'
      : value === false || value === 'false'
        ? 'false'
        : text,
  );

  /** A whole or decimal number is written as a number, so the schema can check it. */
  const numberOrText = (input: string): unknown =>
    input.trim() === '' ? undefined : /^-?\d+(\.\d+)?$/.test(input.trim()) ? Number(input) : input;
</script>

{#if field.kind === 'list'}
  <ListField
    {id}
    label={field.label}
    fieldKey={field.key}
    values={toList(value)}
    onChange={(items) => onChange(items.length > 0 ? items : undefined)}
    hint={field.hint}
    {issues}
    placeholder={field.placeholder}
    {suggestions}
    {disabled}
  />
{:else if field.kind === 'select' || field.kind === 'boolean'}
  <SelectField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={field.kind === 'boolean' ? booleanText : text}
    onChange={(next) =>
      onChange(
        field.kind === 'boolean'
          ? next === 'true'
            ? true
            : next === 'false'
              ? false
              : undefined
          : next || undefined,
      )}
    options={(field.kind === 'boolean' ? ['true', 'false'] : options).map((option) => ({
      value: option,
    }))}
    hint={field.hint}
    {issues}
    {disabled}
  />
{:else if field.kind === 'structured'}
  <TextField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={draft}
    onChange={(next) => onDraft?.(next)}
    hint={field.hint}
    {issues}
    placeholder={field.placeholder}
    rows={field.rows ?? 5}
    monospace
    {disabled}
  />
{:else}
  <TextField
    {id}
    label={field.label}
    fieldKey={field.key}
    value={text}
    onChange={(next) =>
      onChange(
        field.kind === 'integer' || field.kind === 'effort'
          ? numberOrText(next)
          : next === ''
            ? undefined
            : next,
      )}
    hint={field.hint}
    {issues}
    placeholder={field.placeholder}
    rows={field.kind === 'textarea' ? (field.rows ?? 3) : undefined}
    monospace={field.kind === 'integer' || field.kind === 'effort'}
    {suggestions}
    {disabled}
  />
{/if}
