<script lang="ts">
  import type { MeanComparison } from './analysis';
  import { jitter, niceDomain, scale, thin, ticks } from './chart-scale';
  import { formatCount, formatNumber } from './display';
  import { meanInterval } from './statistics';
  import { placeTooltip } from './tooltip-position';

  type Props = {
    comparison: MeanComparison;
    labels: string[];
    /** What the values are, such as "minutes" or "review minutes". */
    unit: string;
  };

  const { comparison, labels, unit }: Props = $props();

  /** Past this many dots per condition, the plot draws an even sample of them. */
  const MAX_DOTS = 300;
  const ROW = 92;
  const TOP = 14;
  const BOTTOM = 44;
  const HEIGHT = TOP + ROW * 2 + BOTTOM;
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  let active = $state<number | null>(null);
  let tooltipWidth = $state(0);

  const width = $derived(Math.max(260, measuredWidth || UNMEASURED_WIDTH));
  const narrow = $derived(width < 480);
  const margin = $derived({ left: narrow ? 52 : 84, right: 18 });
  const paired = $derived(comparison.design === 'paired');

  const intervals = $derived([meanInterval(comparison.valuesA), meanInterval(comparison.valuesB)]);
  const domain = $derived(
    niceDomain([
      ...comparison.valuesA,
      ...comparison.valuesB,
      ...intervals.flatMap((interval) => (interval ? [interval.lower, interval.upper] : [])),
    ]),
  );
  const x = $derived(scale(domain.min, domain.max, margin.left, width - margin.right));
  const center = (row: number): number => TOP + ROW * row + ROW / 2 - 10;

  type Point = { row: number; index: number; value: number; y: number };

  // Paired data draws each task's two dots with the same offset, so the line between them is easy
  // to follow. Unpaired data offsets each dot on its own.
  const shown = $derived.by(() => {
    if (paired) {
      const picked = thin(
        comparison.valuesA.map((value, index) => value - comparison.valuesB[index]),
        MAX_DOTS,
      );

      return [picked, picked];
    }

    return [thin(comparison.valuesA, MAX_DOTS), thin(comparison.valuesB, MAX_DOTS)];
  });

  const points = $derived<Point[]>(
    [comparison.valuesA, comparison.valuesB].flatMap((values, row) =>
      shown[row].map((index, order) => ({
        row,
        index,
        value: values[index],
        y: center(row) + jitter(paired ? order : order + row * 7) * 15,
      })),
    ),
  );

  const pairs = $derived(
    paired
      ? shown[0].map((index, order) => {
          const a = comparison.valuesA[index];
          const b = comparison.valuesB[index];

          return {
            index,
            a,
            b,
            yA: center(0) + jitter(order) * 15,
            yB: center(1) + jitter(order) * 15,
          };
        })
      : [],
  );

  const fasterCount = $derived(
    paired
      ? comparison.valuesA.filter((value, index) => comparison.valuesB[index] < value).length
      : 0,
  );

  const total = $derived(comparison.valuesA.length + comparison.valuesB.length);
  const truncated = $derived(
    shown[0].length < comparison.valuesA.length || shown[1].length < comparison.valuesB.length,
  );

  /** The keyboard and pointer step through tasks when paired, and through every dot otherwise. */
  const stops = $derived(paired ? pairs.length : points.length);

  const describe = (stop: number): string => {
    if (paired) {
      const pair = pairs[stop];
      const task = comparison.tasks[pair.index] ?? `Task ${pair.index + 1}`;
      const gap = pair.a - pair.b;
      const how =
        gap > 0
          ? `${formatNumber(gap, 1)} faster under ${labels[1]}`
          : gap < 0
            ? `${formatNumber(-gap, 1)} slower under ${labels[1]}`
            : 'no change';

      return `${task}: ${labels[0]} ${formatNumber(pair.a, 1)}, ${labels[1]} ${formatNumber(pair.b, 1)} ${unit}, ${how}.`;
    }

    const point = points[stop];

    return `${labels[point.row]}, task ${formatCount(point.index + 1)}: ${formatNumber(point.value, 1)} ${unit}.`;
  };

  const anchor = $derived.by(() => {
    if (active === null || active >= stops) return null;
    if (paired) {
      const pair = pairs[active];

      return { x: (x(pair.a) + x(pair.b)) / 2, row: 0 };
    }

    return { x: x(points[active].value), row: points[active].row };
  });

  const tooltipLeft = $derived(anchor ? placeTooltip(anchor.x, tooltipWidth, width, 12) : 0);

  const nearest = (event: PointerEvent): number | null => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const px = event.clientX - bounds.left;
    const py = event.clientY - bounds.top;
    let best: number | null = null;
    let bestDistance = 28;

    if (paired) {
      pairs.forEach((pair, stop) => {
        const distance = Math.min(
          Math.hypot(x(pair.a) - px, pair.yA - py),
          Math.hypot(x(pair.b) - px, pair.yB - py),
        );
        if (distance < bestDistance) {
          bestDistance = distance;
          best = stop;
        }
      });
    } else {
      points.forEach((point, stop) => {
        const distance = Math.hypot(x(point.value) - px, point.y - py);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = stop;
        }
      });
    }

    return best;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (stops === 0) return;
    const current = active ?? 0;
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };

    if (event.key in moves) {
      event.preventDefault();
      active = Math.min(stops - 1, Math.max(0, current + moves[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : stops - 1;
    } else if (event.key === 'Escape') {
      active = null;
    }
  };

  const shortLabel = (label: string): string =>
    label.length > (narrow ? 6 : 10) ? `${label.slice(0, narrow ? 5 : 9)}…` : label;

  const slopeClass = (a: number, b: number): string =>
    b < a
      ? 'stroke-emerald-600 dark:stroke-emerald-400'
      : b > a
        ? 'stroke-rose-600 dark:stroke-rose-400'
        : 'stroke-slate-400';
</script>

<div class="space-y-3">
  <p class="text-sm text-slate-600 dark:text-slate-300" data-testid="dot-plot-caption">
    One dot per task. The bar under each row is that condition’s mean, with its 95% interval.
    {#if paired}
      Lines join each task’s two times. {formatCount(fasterCount)} of {formatCount(
        comparison.valuesA.length,
      )} lean left, toward faster under {labels[1]}{fasterCount === comparison.valuesA.length
        ? ': every one'
        : ''}.
    {/if}
    {#if truncated}
      Showing an even sample of {formatCount(shown[0].length + (paired ? 0 : shown[1].length))} of {formatCount(
        paired ? comparison.valuesA.length : total,
      )}.
    {/if}
  </p>

  <div
    bind:clientWidth={measuredWidth}
    role="slider"
    tabindex="0"
    aria-label="Dot plot of every task. Arrow keys move between {paired
      ? 'tasks'
      : 'dots'}. The table below has the same numbers."
    aria-valuemin={1}
    aria-valuemax={Math.max(1, stops)}
    aria-valuenow={(active ?? 0) + 1}
    aria-valuetext={active === null ? 'No task selected.' : describe(active)}
    data-testid="dot-plot"
    class="focus-visible:outline-primary-600 relative touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
    onpointermove={(event) => (active = nearest(event))}
    onpointerdown={(event) => (active = nearest(event))}
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
        {unit[0].toUpperCase()}{unit.slice(1)} per task
      </text>

      {#each [0, 1] as row (row)}
        <text
          x={8}
          y={center(row)}
          dominant-baseline="middle"
          class="fill-slate-800 text-xs font-semibold dark:fill-slate-100"
        >
          {shortLabel(labels[row] ?? '')}
        </text>
      {/each}

      {#each pairs as pair (pair.index)}
        <line
          x1={x(pair.a)}
          y1={pair.yA}
          x2={x(pair.b)}
          y2={pair.yB}
          stroke-width="1.5"
          stroke-dasharray={pair.b > pair.a ? '4 3' : undefined}
          class="{slopeClass(pair.a, pair.b)} opacity-70"
        />
      {/each}

      {#each points as point (`${point.row}-${point.index}`)}
        <circle
          cx={x(point.value)}
          cy={point.y}
          r={points.length > 200 ? 3 : 5}
          class="{point.row === 0
            ? 'fill-slate-500 dark:fill-slate-400'
            : 'fill-primary-600 dark:fill-primary-400'} stroke-white dark:stroke-slate-900"
          stroke-width="1"
        />
      {/each}

      {#each intervals as interval, row (row)}
        {#if interval}
          <g>
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
          </g>
        {/if}
      {/each}

      {#if anchor && active !== null}
        {#if paired}
          <circle
            cx={x(pairs[active].a)}
            cy={pairs[active].yA}
            r="8"
            fill="none"
            stroke-width="2"
            class="stroke-amber-500"
          />
          <circle
            cx={x(pairs[active].b)}
            cy={pairs[active].yB}
            r="8"
            fill="none"
            stroke-width="2"
            class="stroke-amber-500"
          />
        {:else}
          <circle
            cx={x(points[active].value)}
            cy={points[active].y}
            r="8"
            fill="none"
            stroke-width="2"
            class="stroke-amber-500"
          />
        {/if}
      {/if}
    </svg>

    {#if anchor && active !== null}
      <div
        bind:clientWidth={tooltipWidth}
        role="tooltip"
        data-testid="dot-tooltip"
        class="pointer-events-none absolute z-10 w-max max-w-[min(16rem,100%)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:top="{anchor.row === 0 && !paired ? center(1) - 8 : 2}px"
      >
        {describe(active)}
      </div>
    {/if}
  </div>

  <details class="text-sm">
    <summary class="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">
      The plotted values as a table
    </summary>
    <div class="relative mt-2 max-h-72 overflow-auto">
      <table class="w-full text-left tabular-nums">
        <caption class="sr-only">Every task’s value</caption>
        <thead>
          <tr class="border-b border-slate-200 dark:border-slate-700">
            <th scope="col" class="py-1 pr-3">{paired ? 'Task' : 'Condition'}</th>
            {#if paired}
              <th scope="col" class="px-3 py-1">{labels[0]}</th>
              <th scope="col" class="px-3 py-1">{labels[1]}</th>
              <th scope="col" class="px-3 py-1">Difference</th>
            {:else}
              <th scope="col" class="px-3 py-1">Task</th>
              <th scope="col" class="px-3 py-1">{unit[0].toUpperCase()}{unit.slice(1)}</th>
            {/if}
          </tr>
        </thead>
        <tbody>
          {#if paired}
            {#each pairs as pair (pair.index)}
              <tr class="border-b border-slate-100 dark:border-slate-800">
                <th scope="row" class="py-1 pr-3 font-normal [overflow-wrap:anywhere]">
                  {comparison.tasks[pair.index]}
                </th>
                <td class="px-3 py-1">{formatNumber(pair.a, 1)}</td>
                <td class="px-3 py-1">{formatNumber(pair.b, 1)}</td>
                <td class="px-3 py-1">{formatNumber(pair.a - pair.b, 1)}</td>
              </tr>
            {/each}
          {:else}
            {#each points as point (`${point.row}-${point.index}`)}
              <tr class="border-b border-slate-100 dark:border-slate-800">
                <th scope="row" class="py-1 pr-3 font-normal [overflow-wrap:anywhere]"
                  >{labels[point.row]}</th
                >
                <td class="px-3 py-1">{formatCount(point.index + 1)}</td>
                <td class="px-3 py-1">{formatNumber(point.value, 1)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </details>
</div>
