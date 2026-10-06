<script lang="ts">
  import { untrack } from 'svelte';

  import { formatNumber } from './display';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { parseField, ranges } from './scenario';
  import type { NumericField } from './scenario';

  type Props = {
    field: NumericField;
    label: string;
    value: number;
    onChange: (value: number) => void;
    /** Where the default comes from, or that it's an assumption. */
    source: string;
    /** What follows the box, such as "lines" or "%". */
    unit?: string;
    disabled?: boolean;
  };

  const { field, label, value, onChange, source, unit, disabled = false }: Props = $props();

  const id = $derived(`field-${field}`);
  const range = $derived(ranges[field]);

  let text = $state(untrack(() => formatNumber(value)));
  let editing = $state(false);

  const invalid = $derived(parseField(field, text) === null);

  // A preset or a loaded listing changes the value from outside. Show it,
  // unless the person is in the middle of typing in this box.
  $effect(() => {
    const next = formatNumber(value);

    untrack(() => {
      if (!editing) text = next;
    });
  });
</script>

<div class="space-y-1">
  <label for={id} class={labelClasses}>{label}</label>
  <div class="flex items-center gap-2">
    <input
      {id}
      type="text"
      inputmode="decimal"
      value={text}
      {disabled}
      autocomplete="off"
      spellcheck="false"
      aria-invalid={invalid || undefined}
      aria-describedby="{id}-hint"
      onfocus={() => (editing = true)}
      onblur={() => {
        editing = false;
        if (!invalid) text = formatNumber(value);
      }}
      oninput={(event) => {
        text = event.currentTarget.value;

        const parsed = parseField(field, text);
        if (parsed !== null) onChange(parsed);
      }}
      class="{fieldClasses} w-28 min-w-0 text-right"
    />
    {#if unit}<span class="text-sm text-slate-600 dark:text-slate-300">{unit}</span>{/if}
  </div>
  <p id="{id}-hint" class={invalid ? 'text-sm text-red-700 dark:text-red-400' : hintClasses}>
    {#if invalid}
      Enter {range.whole ? 'a whole number' : 'a number'} from {formatNumber(range.min)} to {formatNumber(
        range.max,
      )}.
    {:else}
      {source}
    {/if}
  </p>
</div>
