<script lang="ts">
  import { generatedSwatch, hatchSwatch, overflowSwatch } from './chart-tones';
  import { formatLines, plural } from './display';
  import { bodyClasses } from './field-styles';
  import type { SweepPoint } from './model';

  type Props = { points: readonly SweepPoint[]; capacity: number; current: number };

  const { points, capacity, current }: Props = $props();

  const scale = $derived(Math.max(capacity, ...points.map((point) => point.generated), 1));
  const percent = (value: number): string => `${(value / scale) * 100}%`;
</script>

<figure class="space-y-3" data-testid="sweep-chart">
  <figcaption class={bodyClasses}>
    Lines opened each day for one to ten agents, with your count in bold. The dashed line is the
    {formatLines(capacity)} lines you can review well; the striped part of each bar is what’s left over.
  </figcaption>
  <ol class="space-y-1.5 text-sm tabular-nums">
    {#each points as point (point.agents)}
      {@const gap = point.generated - capacity}
      <li
        class="grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem] items-center gap-2 {point.agents ===
        current
          ? 'font-semibold text-slate-900 dark:text-white'
          : 'text-slate-700 dark:text-slate-200'}"
        aria-current={point.agents === current || undefined}
      >
        <span>{point.agents} {plural(point.agents, 'agent')}</span>
        <span class="relative h-5 rounded-sm bg-slate-100 dark:bg-slate-800" aria-hidden="true">
          <span class="absolute inset-y-0 left-0 flex" style:width={percent(point.generated)}>
            <span
              class="h-full {generatedSwatch}"
              style:width="{(Math.min(point.generated, capacity) / Math.max(point.generated, 1)) *
                100}%"
            ></span>
            {#if gap > 0}
              <span class="h-full flex-1 {overflowSwatch} {hatchSwatch}"></span>
            {/if}
          </span>
          <span
            class="absolute -inset-y-1 border-l-2 border-dashed border-slate-900 dark:border-white"
            style:left={percent(capacity)}
          ></span>
        </span>
        <span class="text-right">
          {gap > 0 ? `${formatLines(gap)} over` : 'fits'}
        </span>
      </li>
    {/each}
  </ol>
</figure>
