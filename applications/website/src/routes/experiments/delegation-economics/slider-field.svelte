<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import FromSessionBadge from './from-session-badge.svelte';
  import { sliderPosition } from './scenario';
  import type { NumberRange } from './scenario';

  type Props = {
    /** The text box's `id`, so other parts of the page can move focus to it. */
    id: string;
    label: string;
    value: number;
    range: NumberRange;
    /** How the value reads in the text box when it isn't being edited. */
    format: (value: number) => string;
    /** Reads the text box. Returns null for text that isn't a value. */
    parse: (text: string) => number | null;
    onChange: (value: number) => void;
    /** Where the default comes from, such as the course outline. Shown under the box. */
    hint?: string;
    /** What a person can type, shown when the text isn't valid. */
    example: string;
    fromSession?: boolean;
  };

  const {
    id,
    label,
    value,
    range,
    format,
    parse,
    onChange,
    hint,
    example,
    fromSession = false,
  }: Props = $props();

  let text = $state(untrack(() => format(value)));
  let editing = $state(false);

  const invalid = $derived(parse(text) === null);
  const describedBy = $derived(invalid ? `${id}-error` : hint ? `${id}-hint` : undefined);

  // The value can change from outside, such as when a preset applies. Show it,
  // unless the person is in the middle of typing in this box.
  $effect(() => {
    const next = format(value);

    untrack(() => {
      if (!editing) text = next;
    });
  });

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    text = event.currentTarget.value;

    const parsed = parse(text);
    if (parsed !== null) onChange(parsed);
  };

  const handleBlur = (): void => {
    editing = false;
    if (!invalid) text = format(value);
  };
</script>

<div class="min-w-0 space-y-1.5">
  <label for={id} class={labelClasses}>
    {label}
    {#if fromSession}<FromSessionBadge />{/if}
  </label>
  <div class="flex items-center gap-3">
    <input
      type="range"
      min={range.min}
      max={range.max}
      step={range.step}
      value={sliderPosition(range, value)}
      aria-label={label}
      aria-valuetext={format(value)}
      oninput={(event) => onChange(Number(event.currentTarget.value))}
      class="accent-primary-600 dark:accent-primary-400 h-2 min-w-0 flex-1 cursor-pointer"
    />
    <input
      {id}
      type="text"
      value={text}
      oninput={handleInput}
      onfocus={() => (editing = true)}
      onblur={handleBlur}
      autocomplete="off"
      spellcheck="false"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      class="{fieldClasses} w-24 flex-none text-right sm:w-28"
    />
  </div>
  {#if invalid}
    <p id="{id}-error" class="text-sm text-red-700 dark:text-red-400">
      Enter a value such as {example}.
    </p>
  {:else if hint}
    <p id="{id}-hint" class={hintClasses}>{hint}</p>
  {/if}
</div>
