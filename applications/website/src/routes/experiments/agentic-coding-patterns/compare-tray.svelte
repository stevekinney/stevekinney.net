<script lang="ts">
  import { X } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { maximumCompared } from './explorer-state';
  import type { PatternEntry } from './pattern-types';

  type Props = {
    entries: PatternEntry[];
    onRemove: (id: string) => void;
    onClear: () => void;
    onOpenComparison: () => void;
  };

  const { entries, onRemove, onClear, onOpenComparison }: Props = $props();
</script>

<div
  role="region"
  aria-label="Comparison tray"
  class="fixed inset-x-0 bottom-0 z-30 border-t border-slate-300 bg-white/95 shadow-[0_-4px_12px_rgb(0_0_0/0.08)] backdrop-blur dark:border-slate-600 dark:bg-slate-900/95"
>
  <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
    <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
      Comparing {entries.length} of {maximumCompared}
    </p>
    <ul class="flex min-w-0 flex-1 flex-wrap gap-2">
      {#each entries as entry (entry.id)}
        <li
          class="bg-primary-100 text-primary-950 dark:bg-primary-900/70 dark:text-primary-50 inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pr-1 pl-3 text-sm font-medium"
        >
          <span class="truncate">{entry.name}</span>
          <button
            type="button"
            onclick={() => onRemove(entry.id)}
            class="focus-visible:outline-primary-600 hover:bg-primary-200 dark:hover:bg-primary-800 inline-flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2"
          >
            <X aria-hidden="true" class="size-3.5" />
            <span class="sr-only">Remove {entry.name} from the comparison</span>
          </button>
        </li>
      {/each}
    </ul>
    <div class="flex items-center gap-2">
      <Button variant="ghost" onclick={onClear}>Clear</Button>
      <Button onclick={onOpenComparison}>Open comparison</Button>
    </div>
  </div>
</div>
