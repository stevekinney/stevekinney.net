<script lang="ts">
  type SkeletonShape = 'tiles' | 'bars' | 'rows';

  type Props = {
    /** Which placeholder shape to draw — matches the section it stands in for. */
    shape: SkeletonShape;
    /** Announced to screen readers while the section is still loading. */
    label: string;
    count?: number;
  };

  const defaultCounts: Record<SkeletonShape, number> = { tiles: 8, bars: 5, rows: 5 };

  const { shape, label, count = defaultCounts[shape] }: Props = $props();

  const placeholders = $derived(Array.from({ length: count }, (_, index) => index));
</script>

<div class="animate-pulse motion-reduce:animate-none" aria-busy="true">
  <span class="sr-only" role="status">Loading {label}…</span>

  {#if shape === 'tiles'}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {#each placeholders as placeholder (placeholder)}
        <div class="h-24 rounded-md bg-slate-200 dark:bg-slate-700"></div>
      {/each}
    </div>
  {:else if shape === 'bars'}
    <div class="space-y-3" aria-hidden="true">
      {#each placeholders as placeholder (placeholder)}
        <div class="space-y-1.5">
          <div class="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700"></div>
          <div class="h-2 rounded bg-slate-200 dark:bg-slate-700"></div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="space-y-3" aria-hidden="true">
      {#each placeholders as placeholder (placeholder)}
        <div class="h-14 rounded-md bg-slate-200 dark:bg-slate-700"></div>
      {/each}
    </div>
  {/if}
</div>
