<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import { placeTooltip } from '$lib/experiments/tooltip-position';
  import { formatCount } from './labels';
  import type { CostHistogram } from './statistics';

  type Props = {
    histogram: CostHistogram;
    runs: number;
    /** A short name for the chart, such as "B (current)". */
    title?: string;
    id: string;
  };

  const { histogram, runs, title, id }: Props = $props();

  const HEIGHT = 220;
  const TOP = 40;
  const BOTTOM = 40;
  const LEFT = 8;
  const RIGHT = 8;
  const RUNAWAY_GAP = 18;
  const TOOLTIP_WIDTH = 190;
  const UNMEASURED_WIDTH = 640;

  let measuredWidth = $state(0);
  let active = $state<number | null>(null);

  const width = $derived(Math.max(240, measuredWidth || UNMEASURED_WIDTH));
  const hasRunaway = $derived(histogram.runaway.count > 0);
  const runawayWidth = $derived(hasRunaway ? Math.max(36, width * 0.1) : 0);
  const plotWidth = $derived(width - LEFT - RIGHT - (hasRunaway ? runawayWidth + RUNAWAY_GAP : 0));
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const bottom = TOP + plotHeight;

  const bins = $derived(histogram.bins);
  const binCount = $derived(bins.length + (hasRunaway ? 1 : 0));
  const top = $derived(Math.max(1, histogram.runaway.count, ...bins.map((bin) => bin.count)));
  const axisMaximum = $derived(bins.at(-1)?.to ?? 1);

  const xDollars = (dollars: number): number =>
    LEFT + Math.min(1, dollars / axisMaximum) * plotWidth;
  const barWidth = $derived(plotWidth / Math.max(1, bins.length));
  const barHeight = (count: number): number => (count / top) * plotHeight;
  const runawayX = $derived(LEFT + plotWidth + RUNAWAY_GAP);

  const markers = $derived(
    (
      [
        ['median', 'median', histogram.statistics.median],
        ['p95', '95th', histogram.statistics.p95],
        ['max', 'max', histogram.statistics.maximum],
      ] as const
    ).map(([key, label, dollars], index) => ({
      key,
      label,
      dollars,
      // A value past the settled axis belongs to a runaway run, so it's marked on that bin.
      x: dollars > axisMaximum && hasRunaway ? runawayX + runawayWidth / 2 : xDollars(dollars),
      row: index,
    })),
  );

  const binLabel = (index: number): { range: string; count: number; runaway: boolean } => {
    if (index >= bins.length) {
      const { count, minimum, maximum } = histogram.runaway;

      return {
        range:
          minimum === maximum
            ? `Runaway, ${formatCost(maximum)}`
            : `Runaway, ${formatCost(minimum)} to ${formatCost(maximum)}`,
        count,
        runaway: true,
      };
    }

    const bin = bins[index];

    return {
      range: `${formatCost(bin.from)} to ${formatCost(bin.to)}`,
      count: bin.count,
      runaway: false,
    };
  };

  const activeLabel = $derived(active === null ? null : binLabel(active));
  const anchor = $derived(
    active === null
      ? 0
      : active >= bins.length
        ? runawayX + runawayWidth / 2
        : LEFT + (active + 0.5) * barWidth,
  );
  const tooltipLeft = $derived(placeTooltip(anchor, Math.min(TOOLTIP_WIDTH, width - 8), width));

  const valueText = $derived(
    activeLabel
      ? `${activeLabel.range}: ${formatCount(activeLabel.count)} runs`
      : `Median ${formatCost(histogram.statistics.median)}, 95th percentile ${formatCost(histogram.statistics.p95)}, maximum ${formatCost(histogram.statistics.maximum)}. Use the arrow keys to read each bin.`,
  );

  const binAt = (event: PointerEvent): number | null => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (hasRunaway && x >= runawayX - RUNAWAY_GAP / 2) return bins.length;

    if (x < 0 || x > width) return null;

    // The margins at either side belong to the nearest bin.
    return Math.min(bins.length - 1, Math.max(0, Math.floor((x - LEFT) / barWidth)));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };

    if (event.key in steps) {
      event.preventDefault();
      active = Math.min(binCount - 1, Math.max(0, (active ?? -1) + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : binCount - 1;
    } else if (event.key === 'Escape') {
      active = null;
    }
  };
</script>

<div class="min-w-0 space-y-2" data-testid="histogram-{id}">
  {#if title}<h3 class="font-bold text-slate-900 dark:text-white">{title}</h3>{/if}
  <div
    bind:clientWidth={measuredWidth}
    role="slider"
    tabindex="0"
    aria-label="Total cost per run{title
      ? `, ${title}`
      : ''}. Arrow keys move between bins. The table below has the same numbers."
    aria-valuemin={0}
    aria-valuemax={Math.max(0, binCount - 1)}
    aria-valuenow={active ?? 0}
    aria-valuetext={valueText}
    data-testid="cost-chart"
    class="focus-visible:outline-primary-600 relative cursor-crosshair touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
    onpointermove={(event) => (active = binAt(event))}
    onpointerdown={(event) => (active = binAt(event))}
    onpointerleave={() => (active = null)}
    onkeydown={handleKeydown}
    onfocus={() => (active ??= 0)}
    onblur={() => (active = null)}
  >
    <svg
      {width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      aria-hidden="true"
      class="block max-w-full"
    >
      <line
        x1={LEFT}
        x2={LEFT + plotWidth}
        y1={bottom}
        y2={bottom}
        class="stroke-slate-300 dark:stroke-slate-600"
      />
      {#each bins as bin, index (index)}
        <rect
          x={LEFT + index * barWidth + 0.5}
          y={bottom - barHeight(bin.count)}
          width={Math.max(0.5, barWidth - 1)}
          height={barHeight(bin.count)}
          class={active === index
            ? 'fill-primary-800 dark:fill-primary-200'
            : 'fill-primary-500 dark:fill-primary-400'}
        />
      {/each}
      {#if hasRunaway}
        <rect
          x={runawayX}
          y={bottom - barHeight(histogram.runaway.count)}
          width={runawayWidth}
          height={barHeight(histogram.runaway.count)}
          class={active === bins.length
            ? 'fill-slate-950 dark:fill-white'
            : 'fill-slate-800 dark:fill-slate-200'}
        />
        <line
          x1={runawayX}
          x2={runawayX + runawayWidth}
          y1={bottom}
          y2={bottom}
          class="stroke-slate-300 dark:stroke-slate-600"
        />
        <text
          x={runawayX + runawayWidth}
          y={bottom + 28}
          text-anchor="end"
          class="fill-slate-800 text-[11px] font-semibold dark:fill-slate-100">Runaway</text
        >
      {/if}

      {#each markers as marker (marker.key)}
        <line
          x1={marker.x}
          x2={marker.x}
          y1={TOP - 4}
          y2={bottom}
          stroke-dasharray="3 3"
          class="stroke-slate-700 dark:stroke-slate-200"
        />
        <text
          x={marker.x}
          y={10 + marker.row * 11}
          text-anchor={marker.x > width - 60 ? 'end' : marker.x < 60 ? 'start' : 'middle'}
          stroke-width="3"
          paint-order="stroke"
          class="fill-slate-800 stroke-white text-[10px] font-semibold tabular-nums dark:fill-slate-100 dark:stroke-slate-900"
          >{marker.label} {formatCost(marker.dollars)}</text
        >
      {/each}

      <text
        x={LEFT}
        y={bottom + 16}
        class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300">$0</text
      >
      <text
        x={LEFT + plotWidth}
        y={bottom + 16}
        text-anchor="end"
        class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >{formatCost(axisMaximum)}</text
      >
      <text
        x={LEFT + plotWidth / 2}
        y={bottom + 32}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-medium dark:fill-slate-200">Total cost per run</text
      >
    </svg>

    {#if activeLabel}
      <div
        role="tooltip"
        data-testid="histogram-tooltip"
        class="pointer-events-none absolute top-8 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:width="{Math.min(TOOLTIP_WIDTH, width - 8)}px"
      >
        <p class="font-semibold">{activeLabel.range}</p>
        <p class="tabular-nums">
          {formatCount(activeLabel.count)} of {formatCount(runs)} runs
        </p>
        {#if activeLabel.runaway}
          <p>Hit the 2,000-iteration horizon with nothing to stop them.</p>
        {/if}
      </div>
    {/if}
  </div>
  <details class="text-sm">
    <summary class="cursor-pointer text-slate-600 dark:text-slate-300">Histogram as a table</summary
    >
    <div class="relative mt-2 max-h-64 overflow-auto">
      <table class="w-full">
        <thead>
          <tr class="text-left text-slate-500 dark:text-slate-400">
            <th scope="col" class="pr-3 font-medium">Total cost</th>
            <th scope="col" class="text-right font-medium">Runs</th>
          </tr>
        </thead>
        <tbody class="tabular-nums">
          {#each Array.from( { length: binCount }, (_, index) => binLabel(index) ) as row, index (index)}
            <tr class="border-t border-slate-100 dark:border-slate-800">
              <td class="pr-3">{row.range}</td>
              <td class="text-right">{formatCount(row.count)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>
