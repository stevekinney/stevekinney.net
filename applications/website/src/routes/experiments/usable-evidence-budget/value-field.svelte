<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses } from './field-styles';
  import { getReady } from './ready-context';

  type Props = {
    id: string;
    value: number;
    /** How a committed value reads in the box, such as `25,000`. */
    format: (value: number) => string;
    /** Reads what was typed. Returns null for text that isn't a usable value. */
    parse: (text: string) => number | null;
    /** Called with each usable value as it is typed. */
    onChange: (value: number) => void;
    /** Shown under the box while the text can't be read. */
    invalidMessage: string;
    /** Names the box when no visible label points at it. */
    ariaLabel?: string;
    describedBy?: string;
    class?: string;
  };

  const {
    id,
    value,
    format,
    parse,
    onChange,
    invalidMessage,
    ariaLabel,
    describedBy,
    class: className = '',
  }: Props = $props();

  const isReady = getReady();

  let text = $state(untrack(() => format(value)));
  let editing = $state(false);

  const invalid = $derived(parse(text) === null);

  // The value can change from outside, such as from the slider or a readout.
  // Show it, unless the person is in the middle of typing in this box.
  $effect(() => {
    const next = value;

    untrack(() => {
      if (!editing && parse(text) !== next) text = format(next);
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

<input
  {id}
  type="text"
  value={text}
  oninput={handleInput}
  onfocus={() => (editing = true)}
  onblur={handleBlur}
  disabled={!isReady()}
  autocomplete="off"
  spellcheck="false"
  aria-label={ariaLabel}
  aria-invalid={invalid || undefined}
  aria-describedby={invalid ? `${id}-error` : describedBy}
  class="{fieldClasses} tabular-nums {className}"
/>
{#if invalid}
  <p id="{id}-error" class="mt-1 text-sm text-red-700 dark:text-red-400">{invalidMessage}</p>
{/if}
