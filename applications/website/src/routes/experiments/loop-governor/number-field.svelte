<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import type { Range } from './loop-config';

  type Props = {
    id: string;
    label: string;
    value: number;
    range: Range;
    onChange: (value: number) => void;
    /** Show a slider beside the box. */
    slider?: boolean;
    /** Shown before the box, such as `$`. */
    prefix?: string;
    hint?: string;
    disabled?: boolean;
  };

  const {
    id,
    label,
    value,
    range,
    onChange,
    slider = false,
    prefix,
    hint,
    disabled = false,
  }: Props = $props();

  const show = (number: number): string => String(Number(number.toFixed(6)));

  let text = $state(untrack(() => show(value)));
  let editing = $state(false);

  const parse = (input: string): number | null => {
    const trimmed = input.trim().replace(/^\$/, '').replace(/,/g, '');
    if (trimmed === '') return null;

    const number = Number(trimmed);
    if (!Number.isFinite(number) || number < range.min || number > range.max) return null;
    if (Number.isInteger(range.step) && !Number.isInteger(number)) return null;

    return number;
  };

  const invalid = $derived(parse(text) === null);
  const describedBy = $derived(
    [invalid ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') ||
      undefined,
  );

  // A preset or a shared link can change the value. Show it, unless the person is typing here.
  $effect(() => {
    const next = show(value);

    untrack(() => {
      if (!editing) text = next;
    });
  });

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    editing = true;
    text = event.currentTarget.value;

    const parsed = parse(text);
    if (parsed !== null && parsed !== value) onChange(parsed);
  };

  const handleBlur = (): void => {
    editing = false;
    text = show(value);
  };
</script>

<div class="min-w-0 space-y-1.5">
  <label for={id} class={labelClasses}>{label}</label>
  <div class="flex min-w-0 items-center gap-3">
    {#if slider}
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        {value}
        {disabled}
        aria-label={label}
        aria-valuetext={show(value)}
        oninput={(event) => onChange(Number(event.currentTarget.value))}
        class="accent-primary-600 min-w-0 flex-1 cursor-pointer disabled:cursor-not-allowed"
      />
    {/if}
    <div class="flex items-center gap-1 {slider ? 'w-24 flex-none' : 'w-full max-w-40'}">
      {#if prefix}<span aria-hidden="true" class="text-slate-500 dark:text-slate-400">{prefix}</span
        >{/if}
      <input
        {id}
        type="text"
        inputmode="decimal"
        autocomplete="off"
        value={text}
        {disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        oninput={handleInput}
        onblur={handleBlur}
        class="{fieldClasses} w-full min-w-0"
      />
    </div>
  </div>
  {#if invalid}
    <p id="{id}-error" class="text-sm text-red-700 dark:text-red-400">
      Enter a number from {show(range.min)} to {show(range.max)}{Number.isInteger(range.step)
        ? ', with no decimals'
        : ''}.
    </p>
  {/if}
  {#if hint}<p id="{id}-hint" class={hintClasses}>{hint}</p>{/if}
</div>
