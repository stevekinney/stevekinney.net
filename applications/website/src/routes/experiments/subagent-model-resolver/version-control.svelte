<script lang="ts">
  import { untrack } from 'svelte';

  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { clampVersion, formatVersion, isInRange, parseVersion } from './versions';
  import type { Version, VersionRange } from './versions';

  type Props = {
    id: string;
    version: Version;
    range: VersionRange;
    disabled?: boolean;
    onChange: (version: Version) => void;
  };

  const { id, version, range, disabled = false, onChange }: Props = $props();

  let text = $state(untrack(() => formatVersion(version)));
  let editing = $state(false);

  const invalid = $derived(parseVersion(text) === null);
  const outside = $derived(!invalid && !isInRange(version, range));
  const shown = $derived(clampVersion(version, range));

  // The version can change from outside, such as from a preset or a click on the strip.
  $effect(() => {
    const next = formatVersion(version);

    untrack(() => {
      if (!editing && text !== next) text = next;
    });
  });

  const handleInput = (event: Event & { currentTarget: HTMLInputElement }): void => {
    text = event.currentTarget.value;

    const parsed = parseVersion(text);
    if (parsed) onChange(parsed);
  };

  const handleSlider = (event: Event & { currentTarget: HTMLInputElement }): void => {
    onChange({ ...range.first, patch: Number(event.currentTarget.value) });
  };

  const describedBy = $derived(invalid ? `${id}-error` : outside ? `${id}-outside` : `${id}-hint`);
</script>

<div class="space-y-1.5">
  <label for={id} class={labelClasses}>Claude Code version</label>
  <div class="flex items-center gap-3">
    <div class="w-28 flex-none">
      <input
        {id}
        type="text"
        value={text}
        {disabled}
        oninput={handleInput}
        onfocus={() => (editing = true)}
        onblur={() => {
          editing = false;
          if (!invalid) text = formatVersion(version);
        }}
        autocomplete="off"
        spellcheck="false"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        class="{fieldClasses} font-mono tabular-nums"
      />
    </div>
    <input
      id="{id}-slider"
      type="range"
      min={range.first.patch}
      max={range.last.patch}
      step="1"
      value={shown.patch}
      {disabled}
      oninput={handleSlider}
      aria-label="Patch number, from {formatVersion(range.first)} to {formatVersion(range.last)}"
      aria-valuetext={formatVersion(shown)}
      class="accent-primary-600 dark:accent-primary-400 min-w-0 flex-1"
    />
  </div>
  {#if invalid}
    <p id="{id}-error" class="text-sm text-red-700 dark:text-red-400">
      Enter a version like 2.1.278.
    </p>
  {:else if outside}
    <p id="{id}-outside" class="text-sm text-amber-800 dark:text-amber-300">
      {formatVersion(version)} is outside the range, so this page shows {formatVersion(shown)}.
    </p>
  {:else}
    <p id="{id}-hint" class={hintClasses}>
      Type a version or drag the slider. The range is {formatVersion(range.first)} to {formatVersion(
        range.last,
      )}.
    </p>
  {/if}
</div>
