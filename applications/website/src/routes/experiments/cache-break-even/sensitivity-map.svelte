<script lang="ts">
  import type { ChangeEvaluation } from './calculate';
  import { formatTokens } from './display';
  import {
    MAP_COLUMNS,
    MAP_MAX,
    MAP_MIN,
    MAP_ROWS,
    boundarySegment,
    buildMapCells,
    cellCenter,
    cellIntensity,
    describeBoundary,
    describeCell,
    logPosition,
    roundToSignificantDigits,
  } from './sensitivity';
  import type { MapCell } from './sensitivity';
  import { placeTooltip } from '$lib/experiments/tooltip-position';

  type Props = {
    evaluation: ChangeEvaluation;
    onSelect: (contextTokens: number, remainingOutput: number) => void;
  };

  const { evaluation, onSelect }: Props = $props();

  let width = $state(640);
  const height = $derived(width < 480 ? 340 : 400);
  const margins = $derived({
    top: 12,
    right: width < 480 ? 14 : 20,
    bottom: 58,
    left: width < 480 ? 56 : 68,
  });
  const plotWidth = $derived(Math.max(1, width - margins.left - margins.right));
  const plotHeight = $derived(Math.max(1, height - margins.top - margins.bottom));
  const cellWidth = $derived(plotWidth / MAP_COLUMNS);
  const cellHeight = $derived(plotHeight / MAP_ROWS);

  const cells = $derived(buildMapCells(evaluation));
  const aheadCells = $derived(cells.filter((cell) => cell.net > 1e-9));
  const behindCells = $derived(cells.filter((cell) => cell.net < -1e-9));
  const boundary = $derived(boundarySegment(evaluation));

  const xOf = (context: number): number => margins.left + logPosition(context) * plotWidth;
  const yOf = (output: number): number => margins.top + (1 - logPosition(output)) * plotHeight;

  const ticks = [MAP_MIN, 10_000, 100_000, 1_000_000, MAP_MAX];

  let hoveredCell = $state<{ column: number; row: number } | null>(null);
  let focused = $state(false);
  let keyboardCell = $state<{ column: number; row: number } | null>(null);

  const currentCell = $derived({
    column: Math.min(
      MAP_COLUMNS - 1,
      Math.floor(logPosition(evaluation.contextTokens) * MAP_COLUMNS),
    ),
    row: Math.min(
      MAP_ROWS - 1,
      Math.floor((1 - logPosition(evaluation.remainingOutput)) * MAP_ROWS),
    ),
  });

  const activeCell = $derived(hoveredCell ?? (focused ? (keyboardCell ?? currentCell) : null));
  const active = $derived(
    activeCell ? (cells[activeCell.row * MAP_COLUMNS + activeCell.column] as MapCell) : null,
  );
  const activeText = $derived(
    active
      ? describeCell(active.contextTokens, active.remainingOutput, active.net, formatTokens)
      : '',
  );
  let tooltipWidth = $state(0);
  const tooltipAnchor = $derived(
    activeCell ? margins.left + (activeCell.column + 0.5) * cellWidth : 0,
  );
  // Held inside the plot so the tooltip can neither widen the page nor cover the axis labels.
  const tooltipLeft = $derived(
    placeTooltip(tooltipAnchor, tooltipWidth, width, 14, {
      left: margins.left,
      right: margins.right,
    }),
  );
  const tooltipTop = $derived(activeCell ? margins.top + (activeCell.row + 0.5) * cellHeight : 0);

  const boundaryWords = $derived(describeBoundary(evaluation));

  const cellAt = (event: { clientX: number; clientY: number }, element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    const column = Math.floor((event.clientX - box.left - margins.left) / cellWidth);
    const row = Math.floor((event.clientY - box.top - margins.top) / cellHeight);

    return column >= 0 && column < MAP_COLUMNS && row >= 0 && row < MAP_ROWS
      ? { column, row }
      : null;
  };

  const choose = (cell: { column: number; row: number }): void => {
    const { context, output } = cellCenter(cell.column, cell.row);

    onSelect(roundToSignificantDigits(context), roundToSignificantDigits(output));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const current = keyboardCell ?? currentCell;
    const step = event.shiftKey ? 4 : 1;
    let { column, row } = current;

    if (event.key === 'ArrowRight') column += step;
    else if (event.key === 'ArrowLeft') column -= step;
    else if (event.key === 'ArrowUp') row -= step;
    else if (event.key === 'ArrowDown') row += step;
    else if (event.key === 'Enter') {
      choose(current);
      event.preventDefault();

      return;
    } else return;

    keyboardCell = {
      column: Math.min(MAP_COLUMNS - 1, Math.max(0, column)),
      row: Math.min(MAP_ROWS - 1, Math.max(0, row)),
    };
    event.preventDefault();
  };

  // Fully opaque cells would hide the lines drawn over them.
  const opacity = (net: number): number => 0.12 + 0.78 * cellIntensity(net);
</script>

<div class="space-y-3">
  <div
    role="slider"
    tabindex="0"
    aria-valuemin={0}
    aria-valuemax={MAP_COLUMNS * MAP_ROWS - 1}
    aria-valuenow={activeCell
      ? activeCell.row * MAP_COLUMNS + activeCell.column
      : currentCell.row * MAP_COLUMNS + currentCell.column}
    aria-valuetext={activeText || describeBoundary(evaluation)}
    aria-label="Sensitivity map of net by context and remaining work. Use the arrow keys to move between cells and Enter to set both."
    aria-describedby="map-description"
    bind:clientWidth={width}
    onpointermove={(event) => (hoveredCell = cellAt(event, event.currentTarget))}
    onpointerleave={() => (hoveredCell = null)}
    onclick={(event) => {
      const cell = cellAt(event, event.currentTarget);

      if (cell) {
        keyboardCell = cell;
        choose(cell);
      }
    }}
    onkeydown={handleKeydown}
    onfocus={() => (focused = true)}
    onblur={() => {
      focused = false;
      keyboardCell = null;
    }}
    class="focus-visible:outline-primary-600 relative cursor-crosshair overflow-x-clip rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
    data-sensitivity-map
  >
    <svg viewBox="0 0 {width} {height}" class="block h-auto w-full" aria-hidden="true">
      <rect
        x={margins.left}
        y={margins.top}
        width={plotWidth}
        height={plotHeight}
        class="fill-slate-50 stroke-slate-300 dark:fill-slate-800/60 dark:stroke-slate-600"
      />
      <g class="fill-sky-600 dark:fill-sky-400">
        {#each aheadCells as cell (cell.row * MAP_COLUMNS + cell.column)}
          <rect
            x={margins.left + cell.column * cellWidth}
            y={margins.top + cell.row * cellHeight}
            width={cellWidth + 0.5}
            height={cellHeight + 0.5}
            fill-opacity={opacity(cell.net)}
          />
        {/each}
      </g>
      <g class="fill-orange-500 dark:fill-orange-400">
        {#each behindCells as cell (cell.row * MAP_COLUMNS + cell.column)}
          <rect
            x={margins.left + cell.column * cellWidth}
            y={margins.top + cell.row * cellHeight}
            width={cellWidth + 0.5}
            height={cellHeight + 0.5}
            fill-opacity={opacity(cell.net)}
          />
        {/each}
      </g>

      {#each ticks as tick (tick)}
        <text
          x={xOf(tick)}
          y={margins.top + plotHeight + 16}
          text-anchor={tick === MAP_MIN ? 'start' : tick === MAP_MAX ? 'end' : 'middle'}
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatTokens(tick)}
        </text>
        <text
          x={margins.left - 6}
          y={yOf(tick)}
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatTokens(tick)}
        </text>
      {/each}
      <text
        x={margins.left + plotWidth / 2}
        y={height - 8}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-semibold dark:fill-slate-200"
      >
        Tokens already in context (N)
      </text>
      <text
        transform="translate(13 {margins.top + plotHeight / 2}) rotate(-90)"
        text-anchor="middle"
        class="fill-slate-700 text-xs font-semibold dark:fill-slate-200"
      >
        Remaining output (R)
      </text>

      {#if boundary}
        <line
          x1={xOf(boundary.from.context)}
          y1={yOf(boundary.from.output)}
          x2={xOf(boundary.to.context)}
          y2={yOf(boundary.to.output)}
          stroke-width="2.5"
          stroke-linecap="round"
          class="stroke-slate-900 dark:stroke-white"
        />
      {/if}

      {#if activeCell}
        <rect
          x={margins.left + activeCell.column * cellWidth}
          y={margins.top + activeCell.row * cellHeight}
          width={cellWidth}
          height={cellHeight}
          fill="none"
          stroke-width="2"
          class="stroke-slate-900 dark:stroke-white"
        />
      {/if}

      <circle
        cx={xOf(evaluation.contextTokens)}
        cy={yOf(evaluation.remainingOutput)}
        r="7"
        stroke-width="3"
        class="fill-fuchsia-600 stroke-white dark:fill-fuchsia-400 dark:stroke-slate-900"
      />
    </svg>

    {#if active}
      <div
        role="tooltip"
        data-map-tooltip
        bind:clientWidth={tooltipWidth}
        class="pointer-events-none absolute z-10 w-max rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
        style="left: {tooltipLeft}px; top: {tooltipTop}px; max-width: min(16rem, {plotWidth}px); transform: translateY({tooltipTop >
        height * 0.7
          ? 'calc(-100% - 8px)'
          : '8px'});"
      >
        {activeText}
      </div>
    {/if}
  </div>

  <p
    id="map-description"
    class="text-sm font-semibold text-slate-800 dark:text-slate-100"
    data-boundary
  >
    {boundaryWords}
    {#if !evaluation.unchanged}
      Your setup is at N {formatTokens(evaluation.contextTokens)} and R {formatTokens(
        evaluation.remainingOutput,
      )}, which is {evaluation.net >= -1e-9 ? 'ahead' : 'behind'}.
    {/if}
  </p>

  <ul class="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700 dark:text-slate-200">
    <li class="flex items-center gap-2">
      <span class="inline-block size-4 rounded-sm bg-sky-600/70 dark:bg-sky-400/70"></span>
      Ahead (darker is more)
    </li>
    <li class="flex items-center gap-2">
      <span class="inline-block size-4 rounded-sm bg-orange-500/70 dark:bg-orange-400/70"></span>
      Behind (darker is more)
    </li>
    <li class="flex items-center gap-2">
      <span class="inline-block h-0.5 w-6 rounded bg-slate-900 dark:bg-white"></span>
      Break-even line
    </li>
    <li class="flex items-center gap-2">
      <span class="inline-block size-3.5 rounded-full bg-fuchsia-600 dark:bg-fuchsia-400"></span>
      Your setup
    </li>
  </ul>
  <p class="text-sm text-slate-600 dark:text-slate-300">
    Cells saturate at a net of $100 either way. Both axes are logarithmic, from {formatTokens(
      MAP_MIN,
    )}
    to {formatTokens(MAP_MAX)}.
  </p>
</div>
