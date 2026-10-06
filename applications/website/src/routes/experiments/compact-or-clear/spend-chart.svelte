<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import {
    formatAxisDollars,
    gridValues,
    nudgeApart,
    xTicks,
    yAxisMaximum,
  } from './chart-geometry';
  import type { Projection, StrategyId } from './projection';
  import { strategyStyles } from './strategy-styles';

  type Props = {
    projection: Projection;
    turns: number;
  };

  const { projection, turns }: Props = $props();

  const HEIGHT = 340;
  const MARGIN_TOP = 14;
  const MARGIN_BOTTOM = 44;
  const LABEL_GAP = 15;
  const TOOLTIP_WIDTH = 170;
  /** What the chart draws at before it has been measured, such as while prerendering. */
  const UNMEASURED_WIDTH = 720;

  let measuredWidth = $state(0);
  let hoverTurn = $state<number | null>(null);

  const width = $derived(Math.max(240, measuredWidth || UNMEASURED_WIDTH));
  const narrow = $derived(width < 560);
  const margin = $derived({
    top: MARGIN_TOP,
    right: narrow ? 100 : 132,
    bottom: MARGIN_BOTTOM,
    left: narrow ? 42 : 48,
  });
  const plotWidth = $derived(width - margin.left - margin.right);
  const plotHeight = HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const bottom = $derived(margin.top + plotHeight);

  const lines = $derived(
    (['keep', 'compact', 'switch'] as const).flatMap((id) => {
      const values = projection[id];

      return values ? [{ id, values, style: strategyStyles[id] }] : [];
    }),
  );

  const yMaximum = $derived(
    yAxisMaximum(Math.max(...lines.map((line) => line.values.at(-1) ?? 0))),
  );

  const x = (turn: number): number => margin.left + (turn / turns) * plotWidth;
  const y = (dollars: number): number =>
    margin.top + plotHeight - (dollars / yMaximum) * plotHeight;

  const pointsFor = (values: readonly number[]): string =>
    values.map((value, turn) => `${x(turn).toFixed(1)},${y(value).toFixed(1)}`).join(' ');

  // Direct labels sit at each line's end, nudged apart so none touch.
  const endLabels = $derived.by(() => {
    const placed = nudgeApart(
      lines.map((line) => y(line.values.at(-1) ?? 0)),
      LABEL_GAP,
      margin.top + 6,
      bottom - 4,
    );

    return lines.map((line, index) => ({
      id: line.id,
      style: line.style,
      y: placed[index],
      text: `${narrow ? line.style.shortName : line.style.name} ${formatCost(line.values.at(-1) ?? 0)}`,
    }));
  });

  const crossovers = $derived(
    (
      [
        ['compact', projection.compactCrossover],
        ['switch', projection.switchCrossover],
      ] as const
    ).flatMap(([id, turn]) => {
      const values = projection[id];
      // A crossover at turn 0 can't be told apart from the start, so it gets no marker.
      if (!values || turn === null || turn < 1 || turn > turns) return [];

      return [{ id, turn, dollars: values[turn], style: strategyStyles[id] }];
    }),
  );

  const activeTurn = $derived(hoverTurn);

  const readings = $derived(
    activeTurn === null
      ? []
      : lines.map((line) => ({
          id: line.id,
          style: line.style,
          dollars: line.values[Math.min(activeTurn, line.values.length - 1)],
        })),
  );

  const valueText = $derived(
    activeTurn === null
      ? `Turn 0 of ${turns}. Use the arrow keys to move between turns.`
      : `Turn ${activeTurn}: ${readings.map((reading) => `${reading.style.name} ${formatCost(reading.dollars)}`).join(', ')}.`,
  );

  const turnAt = (event: PointerEvent | MouseEvent): number => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const turn = Math.round(((event.clientX - bounds.left - margin.left) / plotWidth) * turns);

    return Math.min(turns, Math.max(0, turn));
  };

  // The tooltip sits beside the crosshair, and inside the plot so it never covers the labels at
  // the line ends. When neither side has room, it's held inside the plot's edge.
  const tooltipLeft = $derived.by(() => {
    if (activeTurn === null) return 0;

    const plotRight = margin.left + plotWidth;
    const right = x(activeTurn) + 10;
    const left = x(activeTurn) - 10 - TOOLTIP_WIDTH;
    if (right + TOOLTIP_WIDTH <= plotRight) return right;
    if (left >= 4) return left;

    return Math.max(4, Math.min(right, plotRight - TOOLTIP_WIDTH));
  });

  const handleKeydown = (event: KeyboardEvent): void => {
    const current = activeTurn ?? 0;
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 5,
      PageDown: -5,
    };

    if (event.key in steps) {
      event.preventDefault();
      hoverTurn = Math.min(turns, Math.max(0, current + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      hoverTurn = event.key === 'Home' ? 0 : turns;
    }
  };

  const labelAnchor = (turn: number): 'start' | 'middle' | 'end' => {
    if (x(turn) < margin.left + 26) return 'start';
    if (x(turn) > margin.left + plotWidth - 26) return 'end';

    return 'middle';
  };

  const swatchId = (id: StrategyId): string => `chart-swatch-${id}`;
</script>

<div class="space-y-3">
  <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    {#each lines as line (line.id)}
      <li class="flex items-center gap-2" id={swatchId(line.id)}>
        <span aria-hidden="true" class="inline-block h-1 w-6 rounded-full {line.style.swatch}"
        ></span>
        {line.style.name}{line.style.dash ? ' (dashed)' : ''}
      </li>
    {/each}
  </ul>

  <div
    bind:clientWidth={measuredWidth}
    role="slider"
    tabindex="0"
    aria-label="Cumulative spend by turn. Arrow keys move between turns."
    aria-valuemin={0}
    aria-valuemax={turns}
    aria-valuenow={activeTurn ?? 0}
    aria-valuetext={valueText}
    aria-orientation="horizontal"
    data-testid="spend-chart"
    class="focus-visible:outline-primary-600 relative cursor-crosshair touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
    onpointermove={(event) => (hoverTurn = turnAt(event))}
    onpointerdown={(event) => (hoverTurn = turnAt(event))}
    onpointerleave={() => (hoverTurn = null)}
    onkeydown={handleKeydown}
    onfocus={() => (hoverTurn ??= 0)}
    onblur={() => (hoverTurn = null)}
  >
    <svg
      {width}
      height={HEIGHT}
      viewBox="0 0 {width} {HEIGHT}"
      aria-hidden="true"
      class="block max-w-full"
    >
      {#each gridValues(yMaximum) as value (value)}
        <line
          x1={margin.left}
          x2={margin.left + plotWidth}
          y1={y(value)}
          y2={y(value)}
          class="stroke-slate-200 dark:stroke-slate-700"
          stroke-width="1"
        />
        <text
          x={margin.left - 6}
          y={y(value)}
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatAxisDollars(value)}
        </text>
      {/each}

      {#each xTicks(turns) as tick (tick)}
        <line
          x1={x(tick)}
          x2={x(tick)}
          y1={bottom}
          y2={bottom + 4}
          class="stroke-slate-400 dark:stroke-slate-500"
          stroke-width="1"
        />
        <text
          x={x(tick)}
          y={bottom + 17}
          text-anchor="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {tick}
        </text>
      {/each}
      <text
        x={margin.left + plotWidth / 2}
        y={HEIGHT - 6}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-medium dark:fill-slate-200"
      >
        Turns from now
      </text>

      {#each crossovers as marker (marker.id)}
        <line
          x1={x(marker.turn)}
          x2={x(marker.turn)}
          y1={y(marker.dollars)}
          y2={bottom}
          stroke-dasharray="4 3"
          stroke-width="1.5"
          class={marker.style.stroke}
        />
      {/each}

      {#each lines as line (line.id)}
        <polyline
          points={pointsFor(line.values)}
          fill="none"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-dasharray={line.style.dash}
          class={line.style.stroke}
        />
      {/each}

      {#each crossovers as marker, index (marker.id)}
        <circle
          cx={x(marker.turn)}
          cy={y(marker.dollars)}
          r="5"
          stroke-width="2"
          class="stroke-white dark:stroke-slate-900 {marker.style.fill}"
        />
        <text
          x={x(marker.turn) +
            (labelAnchor(marker.turn) === 'start'
              ? 5
              : labelAnchor(marker.turn) === 'end'
                ? -5
                : 0)}
          y={bottom - 8 - index * 15}
          text-anchor={labelAnchor(marker.turn)}
          stroke-width="3"
          paint-order="stroke"
          class="stroke-white text-[11px] font-semibold tabular-nums dark:stroke-slate-900 {marker
            .style.text}"
        >
          turn {marker.turn}
        </text>
      {/each}

      {#each endLabels as label (label.id)}
        <text
          x={margin.left + plotWidth + 8}
          y={label.y}
          dominant-baseline="middle"
          class="text-[11px] font-semibold tabular-nums {label.style.text}"
        >
          {label.text}
        </text>
      {/each}

      {#if activeTurn !== null}
        <line
          x1={x(activeTurn)}
          x2={x(activeTurn)}
          y1={margin.top}
          y2={bottom}
          stroke-width="1"
          class="stroke-slate-500 dark:stroke-slate-400"
        />
        {#each lines as line (line.id)}
          <circle
            cx={x(activeTurn)}
            cy={y(line.values[Math.min(activeTurn, line.values.length - 1)])}
            r="4"
            stroke-width="2"
            class="stroke-white dark:stroke-slate-900 {line.style.fill}"
          />
        {/each}
      {/if}
    </svg>

    {#if activeTurn !== null}
      <div
        role="tooltip"
        data-testid="chart-tooltip"
        class="pointer-events-none absolute top-2 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:width="{TOOLTIP_WIDTH}px"
      >
        <p class="font-semibold">
          Turn {activeTurn}{activeTurn === 0 ? ' (up front only)' : ''}
        </p>
        <dl class="mt-1 space-y-0.5 tabular-nums">
          {#each readings as reading (reading.id)}
            <div class="flex items-center justify-between gap-4">
              <dt>{reading.style.name}</dt>
              <dd class="font-semibold">{formatCost(reading.dollars)}</dd>
            </div>
          {/each}
        </dl>
      </div>
    {/if}
  </div>

  <p class="text-sm text-slate-600 dark:text-slate-300">
    Hover or use the arrow keys to read a turn. A dot marks the turn each move first costs no more
    than keeping going.
  </p>
</div>
