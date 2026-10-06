<script lang="ts">
  import { isPartial } from './explorer-state';
  import type { PatternEntry } from './pattern-types';

  type Props = {
    entry: PatternEntry;
    /** Also show the confidence, as the detail view does. */
    showConfidence?: boolean;
  };

  const { entry, showConfidence = false }: Props = $props();

  const tag = 'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap';
</script>

<ul class="flex flex-wrap items-center gap-1.5" aria-label="Labels">
  <li class="{tag} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
    <span class="sr-only">Category:</span>
    {entry.category}
  </li>
  {#if entry.maturity}
    <li class="{tag} bg-primary-100 text-primary-900 dark:bg-primary-900/60 dark:text-primary-100">
      <span class="sr-only">Maturity:</span>
      {entry.maturity}
    </li>
  {/if}
  {#if showConfidence && entry.confidence}
    <li class="{tag} bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">
      <span class="sr-only">Confidence:</span>
      {entry.confidence}
    </li>
  {/if}
  {#if isPartial(entry)}
    <li
      class="{tag} border border-dashed border-amber-600 text-amber-900 dark:border-amber-400 dark:text-amber-200"
    >
      {showConfidence ? 'partial entry' : 'partial'}
    </li>
  {/if}
</ul>
