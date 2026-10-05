<script lang="ts">
  import { formatCompactTokenCount as formatTokens, formatCost } from '$lib/experiments/format';

  import {
    formatAxisMultiplier,
    gridValues,
    placeTooltip,
    speedupAxis,
    workersAt,
    X_TICKS,
  } from './chart-geometry';
  import { formatMinutes, formatMultiplier } from './display';
  import type { CurvePoint } from './economics';
  import { MAXIMUM_WORKERS } from './economics';

  type Props = {
    curve: CurvePoint[];
    workers: number;
    bestWorkers: number;
    ceiling: number | null;
    onSelect: (workers: number) => void;
  };

  const { curve, workers, bestWorkers, ceiling, onSelect }: Props = $props();

  const HEIGHT = 300;
  const MARGIN = { top: 18, bottom: 42 };
  const TOOLTIP_WIDTH = 168;
  /** What the chart draws at before it has been measured, such as while prerendering. */
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  let hoverWorkers = $state<number | null>(null);

  const width = $derived(Math.max(240, measuredWidth || UNMEASURED_WIDTH));
  const narrow = $derived(width < 520);
  const margin = $derived({ ...MARGIN, left: narrow ? 40 : 48, right: narrow ? 12 : 20 });
  const plotWidth = $derived(width - margin.left - margin.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const bottom = MARGIN.top + plotHeight;

  const axis = $derived(speedupAxis(curve, ceiling));

  const x = (count: number): number =>
    margin.left + ((count - 1) / (MAXIMUM_WORKERS - 1)) * plotWidth;
  const y = (speedup: number): number =>
    MARGIN.top + plotHeight - (Math.min(speedup, axis.maximum) / axis.maximum) * plotHeight;

  const idealPoints = $derived(
    curve.map((point) => `${x(point.workers).toFixed(1)},${y(point.ideal).toFixed(1)}`).join(' '),
  );
  const actualPoints = $derived(
    curve
      .flatMap((point) =>
        point.speedup === null
          ? []
          : [`${x(point.workers).toFixed(1)},${y(point.speedup).toFixed(1)}`],
      )
      .join(' '),
  );

  const ceilingLabel = $derived(
    ceiling === null
      ? 'No serial work, so no ceiling'
      : `never faster than ${formatMultiplier(ceiling)}`,
  );

  const active = $derived(hoverWorkers === null ? null : curve[hoverWorkers - 1]);
  const current = $derived(curve[workers - 1]);
  const best = $derived(curve[bestWorkers - 1]);

  const describe = (point: CurvePoint): string =>
    `${point.workers} ${point.workers === 1 ? 'worker' : 'workers'}: ${formatMinutes(point.minutes)}, ${
      point.speedup === null ? 'no speedup' : `${formatMultiplier(point.speedup)} speedup`
    }, ${formatTokens(point.tokens)} tokens, ${formatCost(point.cost)}.`;

  const valueText = $derived(
    active
      ? describe(active)
      : `${describe(current)} Use the arrow keys to read other worker counts and Enter to choose one.`,
  );

  const tooltipLeft = $derived(
    active ? placeTooltip(x(active.workers), TOOLTIP_WIDTH, 0, width) : 0,
  );

  const pointerWorkers = (event: PointerEvent | MouseEvent): number => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();

    return workersAt(event.clientX - bounds.left, margin.left, plotWidth);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const start = hoverWorkers ?? workers;
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 4,
      PageDown: -4,
    };

    if (event.key in steps) {
      event.preventDefault();
      hoverWorkers = Math.min(MAXIMUM_WORKERS, Math.max(1, start + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      hoverWorkers = event.key === 'Home' ? 1 : MAXIMUM_WORKERS;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(start);
    }
  };

  const markerAnchor = (count: number): 'start' | 'middle' | 'end' => {
    if (x(count) < margin.left + 30) return 'start';
    if (x(count) > margin.left + plotWidth - 30) return 'end';

    return 'middle';
  };
</script>

<div class="space-y-3">
  <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    <li class="flex items-center gap-2">
      <svg aria-hidden="true" width="24" height="6" class="flex-none">
        <line
          x1="0"
          x2="24"
          y1="3"
          y2="3"
          stroke-width="3"
          class="stroke-primary-600 dark:stroke-primary-400"
        />
      </svg>
      With integration (solid)
    </li>
    <li class="flex items-center gap-2">
      <svg aria-hidden="true" width="24" height="6" class="flex-none">
        <line
          x1="0"
          x2="24"
          y1="3"
          y2="3"
          stroke-width="3"
          stroke-dasharray="1 4"
          stroke-linecap="round"
          class="stroke-slate-500 dark:stroke-slate-400"
        />
      </svg>
      Ideal Amdahl curve (dotted)
    </li>
    <li class="flex items-center gap-2">
      <svg aria-hidden="true" width="24" height="6" class="flex-none">
        <line
          x1="0"
          x2="24"
          y1="3"
          y2="3"
          stroke-width="2"
          stroke-dasharray="6 4"
          class="stroke-amber-600 dark:stroke-amber-400"
        />
      </svg>
      Ceiling at 1 ÷ serial fraction (dashed)
    </li>
  </ul>

  <div
    bind:clientWidth={measuredWidth}
    role="slider"
    tabindex="0"
    aria-label="Speedup by number of workers. Arrow keys read each worker count, and Enter chooses it. The table below has the same numbers."
    aria-valuemin={1}
    aria-valuemax={MAXIMUM_WORKERS}
    aria-valuenow={hoverWorkers ?? workers}
    aria-valuetext={valueText}
    data-testid="speedup-chart"
    class="focus-visible:outline-primary-600 relative cursor-crosshair touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
    onpointermove={(event) => (hoverWorkers = pointerWorkers(event))}
    onpointerleave={() => (hoverWorkers = null)}
    onclick={(event) => onSelect(pointerWorkers(event))}
    onkeydown={handleKeydown}
    onfocus={() => (hoverWorkers ??= workers)}
    onblur={() => (hoverWorkers = null)}
  >
    <svg
      {width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      aria-hidden="true"
      class="block max-w-full"
    >
      {#each gridValues(axis.maximum) as value (value)}
        <line
          x1={margin.left}
          x2={margin.left + plotWidth}
          y1={y(value)}
          y2={y(value)}
          stroke-width="1"
          class="stroke-slate-200 dark:stroke-slate-700"
        />
        <text
          x={margin.left - 6}
          y={y(value)}
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatAxisMultiplier(value)}
        </text>
      {/each}

      {#each X_TICKS as tick (tick)}
        {#if !narrow || tick % 8 === 0 || tick === 1}
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1={bottom}
            y2={bottom + 4}
            stroke-width="1"
            class="stroke-slate-400 dark:stroke-slate-500"
          />
          <text
            x={x(tick)}
            y={bottom + 17}
            text-anchor="middle"
            class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
          >
            {tick}
          </text>
        {/if}
      {/each}
      <text
        x={margin.left + plotWidth / 2}
        y={HEIGHT - 6}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-medium dark:fill-slate-200"
      >
        Workers
      </text>

      {#if ceiling !== null && axis.showsCeiling}
        <line
          x1={margin.left}
          x2={margin.left + plotWidth}
          y1={y(ceiling)}
          y2={y(ceiling)}
          stroke-width="2"
          stroke-dasharray="6 4"
          class="stroke-amber-600 dark:stroke-amber-400"
        />
      {/if}
      <text
        x={margin.left + plotWidth - 4}
        y={ceiling !== null && axis.showsCeiling ? y(ceiling) - 6 : MARGIN.top - 4}
        text-anchor="end"
        stroke-width="3"
        paint-order="stroke"
        class="fill-amber-800 stroke-white text-[11px] font-semibold dark:fill-amber-300 dark:stroke-slate-900"
        data-testid="ceiling-label"
      >
        {ceiling !== null && !axis.showsCeiling ? `${ceilingLabel}, above the chart` : ceilingLabel}
      </text>

      <polyline
        points={idealPoints}
        fill="none"
        stroke-width="2.5"
        stroke-dasharray="1 5"
        stroke-linecap="round"
        class="stroke-slate-500 dark:stroke-slate-400"
      />
      <polyline
        points={actualPoints}
        fill="none"
        stroke-width="2.5"
        stroke-linejoin="round"
        class="stroke-primary-600 dark:stroke-primary-400"
      />

      {#if best && best.speedup !== null && best.workers !== workers}
        <circle
          cx={x(best.workers)}
          cy={y(best.speedup)}
          r="5"
          stroke-width="2"
          class="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-slate-900"
        />
        <text
          x={x(best.workers)}
          y={y(best.speedup) - 10}
          text-anchor={markerAnchor(best.workers)}
          stroke-width="3"
          paint-order="stroke"
          class="fill-emerald-800 stroke-white text-[11px] font-semibold dark:fill-emerald-300 dark:stroke-slate-900"
        >
          best {best.workers}
        </text>
      {/if}

      {#if current}
        <line
          x1={x(current.workers)}
          x2={x(current.workers)}
          y1={MARGIN.top}
          y2={bottom}
          stroke-width="1.5"
          stroke-dasharray="3 3"
          class="stroke-primary-700 dark:stroke-primary-300"
        />
        {#if current.speedup !== null}
          <circle
            cx={x(current.workers)}
            cy={y(current.speedup)}
            r="6"
            stroke-width="2"
            class="fill-primary-600 dark:fill-primary-400 stroke-white dark:stroke-slate-900"
          />
        {/if}
        <text
          x={x(current.workers) + (markerAnchor(current.workers) === 'end' ? -4 : 4)}
          y={bottom - 8}
          text-anchor={markerAnchor(current.workers) === 'end' ? 'end' : 'start'}
          stroke-width="3"
          paint-order="stroke"
          class="fill-primary-800 dark:fill-primary-200 stroke-white text-[11px] font-semibold dark:stroke-slate-900"
        >
          n = {current.workers}{best?.workers === current.workers ? ' (best)' : ''}
        </text>
      {/if}

      {#if active}
        <line
          x1={x(active.workers)}
          x2={x(active.workers)}
          y1={MARGIN.top}
          y2={bottom}
          stroke-width="1"
          class="stroke-slate-500 dark:stroke-slate-400"
        />
      {/if}
    </svg>

    {#if active}
      <div
        role="tooltip"
        data-testid="chart-tooltip"
        class="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:width="{TOOLTIP_WIDTH}px"
      >
        <p class="font-semibold">
          {active.workers}
          {active.workers === 1 ? 'worker (solo)' : 'workers'}
        </p>
        <dl class="mt-1 space-y-0.5 tabular-nums">
          <div class="flex justify-between gap-3">
            <dt>Time</dt>
            <dd class="font-semibold">{formatMinutes(active.minutes)}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Speedup</dt>
            <dd class="font-semibold">
              {active.speedup === null ? '—' : formatMultiplier(active.speedup)}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Tokens</dt>
            <dd class="font-semibold">{formatTokens(active.tokens)}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt>Cost</dt>
            <dd class="font-semibold">{formatCost(active.cost)}</dd>
          </div>
        </dl>
      </div>
    {/if}
  </div>

  <p class="text-sm text-slate-600 dark:text-slate-300">
    Hover or use the arrow keys to read a worker count. Click it, or press Enter, to use it.
  </p>

  <details class="rounded-lg border border-slate-200 dark:border-slate-700">
    <summary
      class="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100"
    >
      The curve as a table
    </summary>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="focus-visible:outline-primary-600 relative max-h-80 overflow-auto border-t border-slate-200 focus-visible:outline-2 dark:border-slate-700"
      tabindex="0"
      role="region"
      aria-label="Speedup curve table"
    >
      <table class="w-full border-collapse text-sm tabular-nums">
        <caption class="sr-only">Time, speedup, tokens, and cost for 1 to 32 workers.</caption>
        <thead
          class="sticky top-0 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <tr>
            <th scope="col" class="px-3 py-2 text-left">Workers</th>
            <th scope="col" class="px-3 py-2 text-right">Ideal</th>
            <th scope="col" class="px-3 py-2 text-right">With integration</th>
            <th scope="col" class="px-3 py-2 text-right">Time</th>
            <th scope="col" class="px-3 py-2 text-right">Tokens</th>
            <th scope="col" class="px-3 py-2 text-right">Cost</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
          {#each curve as point (point.workers)}
            <tr
              class={point.workers === workers
                ? 'bg-primary-50 dark:bg-primary-950/40 font-semibold'
                : 'bg-white dark:bg-slate-900'}
            >
              <th scope="row" class="px-3 py-1.5 text-left font-normal">
                {point.workers}{point.workers === workers ? ' (current)' : ''}{point.workers ===
                bestWorkers
                  ? ' (best)'
                  : ''}
              </th>
              <td class="px-3 py-1.5 text-right">{formatMultiplier(point.ideal)}</td>
              <td class="px-3 py-1.5 text-right">
                {point.speedup === null ? '—' : formatMultiplier(point.speedup)}
              </td>
              <td class="px-3 py-1.5 text-right whitespace-nowrap"
                >{formatMinutes(point.minutes)}</td
              >
              <td class="px-3 py-1.5 text-right">{formatTokens(point.tokens)}</td>
              <td class="px-3 py-1.5 text-right">{formatCost(point.cost)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </details>
</div>
