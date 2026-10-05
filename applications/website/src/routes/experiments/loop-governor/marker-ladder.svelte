<script lang="ts">
  import { bodyClasses, fieldClasses } from './field-styles';
  import InlineCode from './inline-code.svelte';
  import { markers, ranges } from './loop-config';
  import type { Ladder, MarkerId } from './loop-config';

  type Props = {
    ready: boolean;
    selected: MarkerId;
    ladder: Ladder;
    onSelect: (marker: MarkerId) => void;
    onEdit: (marker: MarkerId, q: number) => void;
    onReset: () => void;
  };

  const { ready, selected, ladder, onSelect, onEdit, onReset }: Props = $props();

  const edited = $derived(markers.some((marker) => ladder[marker.id] !== marker.defaultQ));

  const read = (text: string): number | null => {
    const value = Number(text);

    return text.trim() !== '' &&
      Number.isFinite(value) &&
      value >= ranges.q.min &&
      value <= ranges.q.max
      ? value
      : null;
  };
</script>

<div class="space-y-4">
  <blockquote
    class="border-primary-500 max-w-3xl border-l-4 pl-4 text-lg font-semibold text-slate-900 dark:text-white"
  >
    A good marker is at least as hard to satisfy as the work it stands for.
  </blockquote>
  <p class={bodyClasses}>
    Weakest at the top. Choose a rung to make it the oracle. The q values are illustrative, not
    measured, so change them to match what you’ve seen.
  </p>
  <ol class="space-y-2">
    {#each markers as marker, index (marker.id)}
      <li
        class="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center {selected ===
        marker.id
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/40'
          : 'border-slate-200 dark:border-slate-700'}"
      >
        <button
          type="button"
          disabled={!ready}
          aria-pressed={selected === marker.id}
          onclick={() => onSelect(marker.id)}
          class="focus-visible:outline-primary-600 flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
        >
          <span
            aria-hidden="true"
            class="flex size-7 flex-none items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-800 dark:bg-slate-700 dark:text-slate-100"
            >{index + 1}</span
          >
          <span class="min-w-0">
            <span class="block font-semibold text-slate-900 dark:text-white"
              ><InlineCode text={marker.name} /></span
            >
            <span class="block text-sm text-slate-600 dark:text-slate-300">{marker.why}</span>
          </span>
        </button>
        <div class="flex flex-none items-center gap-2 pl-10 sm:pl-0">
          <label for="ladder-q-{marker.id}" class="text-sm text-slate-600 dark:text-slate-300"
            >q</label
          >
          <input
            id="ladder-q-{marker.id}"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            value={String(ladder[marker.id])}
            disabled={!ready}
            aria-label="q for {marker.name.replaceAll('`', '')}"
            oninput={(event) => {
              const value = read(event.currentTarget.value);
              event.currentTarget.setAttribute('aria-invalid', String(value === null));
              if (value !== null) onEdit(marker.id, value);
            }}
            onblur={(event) => {
              event.currentTarget.value = String(ladder[marker.id]);
              event.currentTarget.setAttribute('aria-invalid', 'false');
            }}
            class="{fieldClasses} w-20"
          />
        </div>
      </li>
    {/each}
  </ol>
  {#if edited}
    <button
      type="button"
      onclick={onReset}
      class="text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2"
    >
      Reset the q values to the illustrative defaults
    </button>
  {/if}
</div>
