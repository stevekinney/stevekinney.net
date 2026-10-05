<script lang="ts">
  import { untrack } from 'svelte';

  import { formatTokenCount, parseTokenCount } from '$lib/experiments/format';

  import { formatTokens } from './display';
  import { badgeClasses, fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { MAX_TOKENS } from './calculator-state';
  import { logPosition, roundToSignificantDigits, valueAtLogPosition } from './sensitivity';

  type Props = {
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    /** Where the value came from, such as "from your session", until the person edits it. */
    source?: string | null;
    hint?: string;
    disabled?: boolean;
  };

  const { id, label, value, onChange, source = null, hint, disabled = false }: Props = $props();

  const SLIDER_STEPS = 1000;

  let text = $state(untrack(() => formatTokenCount(value)));
  let editing = $state(false);

  const parsed = $derived(parseTokenCount(text));
  const invalid = $derived(parsed === null || parsed > MAX_TOKENS);
  const sliderPosition = $derived(Math.round(logPosition(value) * SLIDER_STEPS));
  const describedBy = $derived(
    [invalid ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') ||
      undefined,
  );

  // The value can change from outside, such as when a session loads. Show it,
  // unless the person is in the middle of typing in this field.
  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing && parseTokenCount(text) !== next) text = formatTokenCount(next);
    });
  });

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    text = event.currentTarget.value;

    const count = parseTokenCount(text);
    if (count !== null && count <= MAX_TOKENS) onChange(count);
  };

  const handleBlur = (): void => {
    editing = false;
    if (!invalid) text = formatTokenCount(value);
  };

  const handleSlider = (event: Event & { currentTarget: HTMLInputElement }): void => {
    const next = roundToSignificantDigits(
      valueAtLogPosition(Number(event.currentTarget.value) / SLIDER_STEPS),
    );

    editing = false;
    text = formatTokenCount(next);
    onChange(next);
  };
</script>

<div class="space-y-2">
  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
    <label for={id} class={labelClasses}>{label}</label>
    {#if source}
      <span class={badgeClasses}>{source}</span>
    {/if}
  </div>
  <div
    class="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]"
  >
    <input
      {id}
      type="text"
      inputmode="numeric"
      value={text}
      {disabled}
      oninput={handleInput}
      onfocus={() => (editing = true)}
      onblur={handleBlur}
      autocomplete="off"
      spellcheck="false"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      class="{fieldClasses} tabular-nums"
    />
    <input
      type="range"
      min="0"
      max={SLIDER_STEPS}
      step="1"
      value={sliderPosition}
      {disabled}
      oninput={handleSlider}
      aria-label="{label} slider, from 1K to 10M"
      aria-valuetext={formatTokens(value)}
      class="accent-primary-600 dark:accent-primary-400 h-6 w-full cursor-pointer disabled:cursor-not-allowed"
    />
  </div>
  {#if invalid}
    <p id="{id}-error" class="text-sm text-red-700 dark:text-red-400">
      Enter a whole number, such as 250000, 250k, or 1.5M. The last good value is still in use.
    </p>
  {/if}
  {#if hint}
    <p id="{id}-hint" class={hintClasses}>{hint}</p>
  {/if}
</div>
