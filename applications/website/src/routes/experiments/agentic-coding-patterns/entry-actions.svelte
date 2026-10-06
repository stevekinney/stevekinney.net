<script lang="ts">
  import { Star } from '@lucide/svelte';

  import { maximumCompared } from './explorer-state';

  type Props = {
    name: string;
    compared: boolean;
    /** Whether the comparison already has its three entries, so this one can't join. */
    comparisonFull: boolean;
    starred: boolean;
    /** Controls need the page's handlers, so they wait for it to hydrate. */
    ready: boolean;
    onToggleCompare: () => void;
    onToggleStar: () => void;
  };

  const { name, compared, comparisonFull, starred, ready, onToggleCompare, onToggleStar }: Props =
    $props();

  const unavailable = $derived(!compared && comparisonFull);
</script>

<div class="flex items-center gap-3">
  <label
    class="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200 {unavailable
      ? 'cursor-not-allowed opacity-60'
      : 'cursor-pointer'}"
    title={unavailable ? `You can compare up to ${maximumCompared} entries.` : undefined}
  >
    <input
      type="checkbox"
      checked={compared}
      disabled={!ready || unavailable}
      onchange={onToggleCompare}
      class="accent-primary-600 focus-visible:outline-primary-600 size-4 cursor-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2"
    />
    Compare<span class="sr-only"> {name}</span>
  </label>
  <button
    type="button"
    aria-pressed={starred}
    disabled={!ready}
    onclick={onToggleStar}
    class="focus-visible:outline-primary-600 inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:text-amber-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:aria-pressed:text-amber-400"
  >
    <Star aria-hidden="true" class="size-5 {starred ? 'fill-current' : ''}" />
    <span class="sr-only">Shortlist {name}</span>
  </button>
</div>
