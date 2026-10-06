<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import type { CompactParts } from './projection';

  type Props = {
    parts: CompactParts;
    warm: boolean;
  };

  const { parts, warm }: Props = $props();

  type Slice = {
    id: 'summarize' | 'generate' | 'rebuild';
    name: string;
    sentence: string;
    dollars: number;
    percent: number;
    bar: string;
    key: string;
  };

  const slices = $derived<Slice[]>(
    (
      [
        {
          id: 'summarize',
          name: warm ? 'Reading history to summarize it' : 'Reading history, uncached',
          sentence: 'Reading history to summarize it',
          dollars: parts.summarize,
          bar: 'bg-orange-200 text-orange-950 dark:bg-orange-300',
          key: 'bg-orange-200 dark:bg-orange-300',
        },
        {
          id: 'generate',
          name: 'Generating the summary',
          sentence: 'Generating the summary',
          dollars: parts.generate,
          bar: 'bg-orange-400 text-orange-950 dark:bg-orange-500 dark:text-white',
          key: 'bg-orange-400 dark:bg-orange-500',
        },
        {
          id: 'rebuild',
          name: 'Rebuilding the cache',
          sentence: 'Rebuilding the cache',
          dollars: parts.rebuild,
          bar: 'bg-orange-700 text-white dark:bg-orange-800',
          key: 'bg-orange-700 dark:bg-orange-800',
        },
      ] as const
    ).map((slice) => ({
      ...slice,
      percent: parts.total > 0 ? (slice.dollars / parts.total) * 100 : 0,
    })),
  );

  const largest = $derived(
    slices.reduce((best, slice) => (slice.dollars > best.dollars ? slice : best), slices[0]),
  );

  const description = $derived(
    slices.map((slice) => `${slice.name} ${Math.round(slice.percent)}%`).join(', '),
  );
</script>

<div class="space-y-3">
  <div
    role="img"
    aria-label="Share of the {formatCost(parts.total)} up-front compaction cost: {description}."
    class="flex h-10 overflow-hidden rounded-md ring-1 ring-slate-300 dark:ring-slate-600"
  >
    {#each slices as slice (slice.id)}
      <div
        class="flex items-center justify-center text-sm font-semibold tabular-nums {slice.bar}"
        style:width="{slice.percent}%"
      >
        {#if slice.percent >= 12}{Math.round(slice.percent)}%{/if}
      </div>
    {/each}
  </div>

  <dl class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
    {#each slices as slice (slice.id)}
      <div class="flex items-center gap-2">
        <span aria-hidden="true" class="inline-block size-3 flex-none rounded-sm {slice.key}"
        ></span>
        <dt class="text-slate-700 dark:text-slate-200">{slice.name}</dt>
        <dd class="ml-auto font-semibold text-slate-900 tabular-nums dark:text-white">
          {formatCost(slice.dollars)}
        </dd>
      </div>
    {/each}
  </dl>

  <p class="text-slate-700 dark:text-slate-200">
    {#if parts.total > 0}
      {largest.sentence} is the largest slice, {Math.round(largest.percent)}% of the up-front cost.
    {:else}
      Compacting costs nothing up front with these settings.
    {/if}
  </p>
</div>
