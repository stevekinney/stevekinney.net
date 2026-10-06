<script lang="ts">
  import { untrack } from 'svelte';

  import { formatCompactTokenCount, parseTokenCount } from '$lib/experiments/format';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { formatFieldNumber, parseFieldNumber } from './field-parsing';
  import type { FieldKind } from './field-parsing';

  type Props = {
    id: string;
    label: string;
    value: number;
    kind: FieldKind;
    minimum: number;
    maximum: number;
    onChange: (value: number) => void;
    hint?: string;
    disabled?: boolean;
    /** Hides the visible label, such as in a grid whose header already names the column. */
    hideLabel?: boolean;
    class?: string;
  };

  const {
    id,
    label,
    value,
    kind,
    minimum,
    maximum,
    onChange,
    hint,
    disabled = false,
    hideLabel = false,
    class: className = '',
  }: Props = $props();

  const format = (number: number): string =>
    kind === 'tokens' ? formatCompactTokenCount(number) : formatFieldNumber(number, kind);
  const parse = (text: string): number | null => {
    const parsed = kind === 'tokens' ? parseTokenCount(text) : parseFieldNumber(text, kind);

    return parsed === null || parsed < minimum || parsed > maximum ? null : parsed;
  };

  let text = $state(untrack(() => format(value)));
  let editing = $state(false);
  const invalid = $derived(parse(text) === null);

  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing && parse(text) !== next) text = format(next);
    });
  });
</script>

<div class="space-y-1.5 {className}">
  <label for={id} class={hideLabel ? 'sr-only' : labelClasses}>{label}</label>
  <input
    {id}
    type="text"
    inputmode={kind === 'integer' ? 'numeric' : 'decimal'}
    value={text}
    {disabled}
    aria-invalid={invalid || undefined}
    aria-describedby={hint ? `${id}-hint` : undefined}
    autocomplete="off"
    spellcheck="false"
    onfocus={() => (editing = true)}
    onblur={() => {
      editing = false;
      if (!invalid) text = format(value);
    }}
    oninput={(event) => {
      text = event.currentTarget.value;
      const parsed = parse(text);
      if (parsed !== null) onChange(parsed);
    }}
    class={fieldClasses}
  />
  {#if hint}
    <p id="{id}-hint" class={hintClasses}>{hint}</p>
  {/if}
</div>
