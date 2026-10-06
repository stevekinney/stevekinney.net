<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses } from './field-styles';
  import { formatPriceNumber, MAX_PRICE } from './pricing';

  type Props = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    /** Whether zero is a usable value. Prices can be free, but an effort factor can't be zero. */
    allowZero?: boolean;
    /** The smallest value the field accepts, when zero is too small. */
    min?: number;
    /** The largest value the field accepts. */
    max?: number;
  };

  const { label, value, onChange, allowZero = true, min = 0, max = MAX_PRICE }: Props = $props();

  let text = $state(untrack(() => formatPriceNumber(value)));
  let editing = $state(false);

  const parse = (source: string): number | null => {
    const normalized = source.trim().replace(/^\$/, '');
    if (!/^(\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

    const number = Number(normalized);

    return Number.isFinite(number) && number >= min && number <= max && (allowZero || number > 0)
      ? number
      : null;
  };

  const invalid = $derived(parse(text) === null);

  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing && parse(text) !== next) text = formatPriceNumber(next);
    });
  });
</script>

<input
  type="text"
  inputmode="decimal"
  value={text}
  aria-label={label}
  aria-invalid={invalid || undefined}
  autocomplete="off"
  spellcheck="false"
  onfocus={() => (editing = true)}
  onblur={() => {
    editing = false;
    if (!invalid) text = formatPriceNumber(value);
  }}
  oninput={(event) => {
    text = event.currentTarget.value;

    const parsed = parse(text);
    if (parsed !== null) onChange(parsed);
  }}
  class="{fieldClasses} w-28 py-1.5 tabular-nums"
/>
