<script lang="ts">
  import { jitter, niceDomain, scale, ticks } from './chart-scale';
  import type { Comparison } from './compare';
  import { formatNumber } from './display';
  import { meanInterval } from './statistics';

  type Props = { comparison: Comparison };

  const { comparison }: Props = $props();

  const ROW = 92;
  const TOP = 14;
  const BOTTOM = 44;
  const HEIGHT = TOP + ROW * 2 + BOTTOM;
  const UNMEASURED_WIDTH = 720;
  const LABELS = ['A', 'B'];

  let measuredWidth = $state(0);

  const width = $derived(Math.max(260, measuredWidth || UNMEASURED_WIDTH));
  const margin = { left: 36, right: 18 };
  const rows = $derived([comparison.a, comparison.b]);
  const intervals = $derived(rows.map((values) => meanInterval(values)));
  const domain = $derived(
    niceDomain([
      ...comparison.a,
      ...comparison.b,
      ...intervals.flatMap((interval) => (interval ? [interval.lower, interval.upper] : [])),
    ]),
  );
  const x = $derived(scale(domain.min, domain.max, margin.left, width - margin.right));
  const center = (row: number): number => TOP + ROW * row + ROW / 2 - 10;

  // Paired, each task's two dots share an offset, so the line between them is easy to follow.
  const y = (row: number, index: number): number =>
    center(row) + jitter(comparison.paired ? index : index + row * 7) * 15;

  const fasterCount = $derived(
    comparison.a.filter((value, index) => comparison.b[index] < value).length,
  );

  const slopeClass = (a: number, b: number): string =>
    b < a
      ? 'stroke-emerald-600 dark:stroke-emerald-400'
      : b > a
        ? 'stroke-rose-600 dark:stroke-rose-400'
        : 'stroke-slate-400';

  const list = (values: readonly number[]): string =>
    values.map((value) => formatNumber(value, 0)).join(', ');
</script>

<div class="space-y-3">
  <p class="text-sm text-slate-600 dark:text-slate-300" data-testid="dot-plot-caption">
    One dot per timing. The bar under each row is its mean, with a 95% interval.
    {#if comparison.paired}
      Lines join each task’s two times: {fasterCount} of {comparison.a.length} tasks were quicker under
      B.
    {:else}
      Without pairing, every task’s own size is noise, and the two rows overlap.
    {/if}
  </p>

  <div bind:clientWidth={measuredWidth} data-testid="dot-plot">
    <svg
      {width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      role="img"
      aria-label="Minutes per task. A: {list(comparison.a)}. B: {list(comparison.b)}."
      class="block max-w-full"
    >
      {#each ticks(domain.min, domain.max, domain.step) as tick (tick)}
        <line
          x1={x(tick)}
          x2={x(tick)}
          y1={TOP}
          y2={TOP + ROW * 2}
          class="stroke-slate-200 dark:stroke-slate-700"
          stroke-width="1"
        />
        <text
          x={x(tick)}
          y={TOP + ROW * 2 + 16}
          text-anchor="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatNumber(tick, domain.step < 1 ? 1 : 0)}
        </text>
      {/each}
      <text
        x={(margin.left + width - margin.right) / 2}
        y={HEIGHT - 6}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-medium dark:fill-slate-200"
      >
        Minutes per task
      </text>

      {#each LABELS as label, row (label)}
        <text
          x={8}
          y={center(row)}
          dominant-baseline="middle"
          class="fill-slate-800 text-xs font-semibold dark:fill-slate-100"
        >
          {label}
        </text>
      {/each}

      {#if comparison.paired}
        {#each comparison.a as a, index (index)}
          {@const b = comparison.b[index]}
          <line
            x1={x(a)}
            y1={y(0, index)}
            x2={x(b)}
            y2={y(1, index)}
            stroke-width="1.5"
            stroke-dasharray={b > a ? '4 3' : undefined}
            class="{slopeClass(a, b)} opacity-70"
          />
        {/each}
      {/if}

      {#each rows as values, row (row)}
        {#each values as value, index (index)}
          <circle
            cx={x(value)}
            cy={y(row, index)}
            r="5"
            class="{row === 0
              ? 'fill-slate-500 dark:fill-slate-400'
              : 'fill-primary-600 dark:fill-primary-400'} stroke-white dark:stroke-slate-900"
            stroke-width="1"
          />
        {/each}
      {/each}

      {#each intervals as interval, row (row)}
        {#if interval}
          <line
            x1={x(interval.lower)}
            x2={x(interval.upper)}
            y1={center(row) + 32}
            y2={center(row) + 32}
            stroke-width="4"
            stroke-linecap="round"
            class="stroke-slate-800 dark:stroke-slate-100"
          />
          <rect
            x={x(interval.mean) - 5}
            y={center(row) + 27}
            width="10"
            height="10"
            transform="rotate(45 {x(interval.mean)} {center(row) + 32})"
            class="fill-white stroke-slate-800 dark:fill-slate-900 dark:stroke-slate-100"
            stroke-width="2"
          />
        {/if}
      {/each}
    </svg>
  </div>
</div>
