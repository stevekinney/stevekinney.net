<script lang="ts">
  import { formatAxisNumber, gridValues, niceMaximum, visibleLabels } from './chart-geometry';
  import { hatchSwatch, toneFill, toneSwatch } from './chart-tones';
  import type { Tone } from './chart-tones';
  import { placeTooltip } from './tooltip-position';

  export type BarSeries = {
    id: string;
    name: string;
    values: readonly number[];
    tone: Tone;
    /** Draws diagonal stripes over the bars, so the series doesn't rely on color alone. */
    hatched?: boolean;
  };

  type Props = {
    /** What the chart shows, read by screen readers along with the value under the cursor. */
    label: string;
    /** The x axis's title, such as "Working day". */
    axisTitle: string;
    /** One label per bar. */
    categories: readonly string[];
    /** Stacked from the bottom up, in order. */
    series: readonly BarSeries[];
    formatValue: (value: number) => string;
    /** A dashed vertical line through one bar, such as the sustainable number of agents. */
    marker?: { index: number; label: string } | null;
    /** A bar to outline, such as the dangerous card. */
    highlight?: number | null;
    /** Extra lines for the tooltip at a bar. */
    describe?: (index: number) => string[];
    /** A small multiple has no tooltip and isn't a stop in the tab order. */
    interactive?: boolean;
    height?: number;
    testId?: string;
  };

  const {
    label,
    axisTitle,
    categories,
    series,
    formatValue,
    marker = null,
    highlight = null,
    describe = () => [],
    interactive = true,
    height = 260,
    testId,
  }: Props = $props();

  const id = $props.id();
  const hatchId = `hatch-${id}`;

  const TOOLTIP_WIDTH = 190;
  const UNMEASURED_WIDTH = 640;
  const MARGIN = { top: 22, right: 8, bottom: 40, left: 44 };

  let measuredWidth = $state(0);
  let hoverIndex = $state<number | null>(null);

  const width = $derived(Math.max(200, measuredWidth || UNMEASURED_WIDTH));
  const plotWidth = $derived(width - MARGIN.left - MARGIN.right);
  const plotHeight = $derived(height - MARGIN.top - MARGIN.bottom);
  const bottom = $derived(MARGIN.top + plotHeight);
  const count = $derived(categories.length);
  const slot = $derived(count > 0 ? plotWidth / count : plotWidth);
  const barWidth = $derived(Math.max(2, Math.min(48, slot * 0.7)));

  const totals = $derived(
    categories.map((_, index) =>
      series.reduce((sum, entry) => sum + Math.max(0, entry.values[index] ?? 0), 0),
    ),
  );
  const maximum = $derived(niceMaximum(Math.max(0, ...totals)));
  const shownLabels = $derived(
    visibleLabels(count, plotWidth, Math.max(...categories.map((text) => text.length), 1) * 7 + 8),
  );

  const center = (index: number): number => MARGIN.left + slot * index + slot / 2;
  const y = (value: number): number => MARGIN.top + plotHeight - (value / maximum) * plotHeight;

  const stacks = $derived(
    categories.map((_, index) => {
      let base = 0;

      return series.map((entry) => {
        const value = Math.max(0, entry.values[index] ?? 0);
        const segment = { entry, top: y(base + value), bottom: y(base) };
        base += value;

        return segment;
      });
    }),
  );

  const activeIndex = $derived(interactive ? hoverIndex : null);

  const readingText = (index: number): string =>
    [
      `${axisTitle} ${categories[index]}`,
      ...series.map((entry) => `${entry.name} ${formatValue(entry.values[index] ?? 0)}`),
      ...describe(index),
    ].join(', ');

  const tooltipLeft = $derived(
    activeIndex === null
      ? 0
      : placeTooltip(center(activeIndex), TOOLTIP_WIDTH, width, 12, { left: 0, right: 0 }),
  );

  const indexAt = (event: PointerEvent | MouseEvent): number => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left - MARGIN.left) / slot);

    return Math.min(count - 1, Math.max(0, index));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const current = hoverIndex ?? 0;
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };

    if (event.key in steps) {
      event.preventDefault();
      hoverIndex = Math.min(count - 1, Math.max(0, current + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      hoverIndex = event.key === 'Home' ? 0 : count - 1;
    } else if (event.key === 'Escape') {
      hoverIndex = null;
    }
  };
</script>

<div class="space-y-2">
  <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    {#each series as entry (entry.id)}
      <li class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="inline-block h-3 w-5 rounded-sm {toneSwatch[entry.tone]} {entry.hatched
            ? hatchSwatch
            : ''}"
        ></span>
        {entry.name}{entry.hatched ? ' (striped)' : ''}
      </li>
    {/each}
    {#if marker}
      <li class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="inline-block h-4 w-0 border-l-2 border-dashed border-slate-700 dark:border-slate-200"
        ></span>
        {marker.label} (dashed line)
      </li>
    {/if}
  </ul>

  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    bind:clientWidth={measuredWidth}
    role={interactive ? 'slider' : 'img'}
    tabindex={interactive ? 0 : undefined}
    aria-label={label}
    aria-valuemin={interactive ? 0 : undefined}
    aria-valuemax={interactive ? Math.max(0, count - 1) : undefined}
    aria-valuenow={interactive ? (activeIndex ?? 0) : undefined}
    aria-valuetext={interactive
      ? activeIndex === null
        ? `${count} bars. Use the arrow keys to read each one.`
        : readingText(activeIndex)
      : undefined}
    data-testid={testId}
    class="focus-visible:outline-primary-600 relative overflow-hidden rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2 {interactive
      ? 'cursor-crosshair touch-pan-y'
      : ''}"
    onpointermove={interactive ? (event) => (hoverIndex = indexAt(event)) : undefined}
    onpointerdown={interactive ? (event) => (hoverIndex = indexAt(event)) : undefined}
    onpointerleave={interactive ? () => (hoverIndex = null) : undefined}
    onkeydown={interactive ? handleKeydown : undefined}
    onfocus={interactive ? () => (hoverIndex ??= 0) : undefined}
    onblur={interactive ? () => (hoverIndex = null) : undefined}
  >
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      aria-hidden="true"
      class="block max-w-full"
    >
      <defs>
        <pattern
          id={hatchId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="6"
            stroke-width="2.5"
            class="stroke-white/70 dark:stroke-slate-900/70"
          />
        </pattern>
      </defs>

      {#each gridValues(maximum) as value (value)}
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotWidth}
          y1={y(value)}
          y2={y(value)}
          stroke-width="1"
          class="stroke-slate-200 dark:stroke-slate-700"
        />
        <text
          x={MARGIN.left - 6}
          y={y(value)}
          text-anchor="end"
          dominant-baseline="middle"
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {formatAxisNumber(value)}
        </text>
      {/each}

      {#each stacks as stack, index (index)}
        {#each stack as segment (segment.entry.id)}
          {#if segment.bottom - segment.top > 0}
            <rect
              x={center(index) - barWidth / 2}
              y={segment.top}
              width={barWidth}
              height={segment.bottom - segment.top}
              class={toneFill[segment.entry.tone]}
            />
            {#if segment.entry.hatched}
              <rect
                x={center(index) - barWidth / 2}
                y={segment.top}
                width={barWidth}
                height={segment.bottom - segment.top}
                fill="url(#{hatchId})"
              />
            {/if}
          {/if}
        {/each}
        {#if highlight === index}
          <rect
            x={center(index) - barWidth / 2 - 3}
            y={Math.min(y(totals[index]), bottom - 6) - 3}
            width={barWidth + 6}
            height={Math.max(6, bottom - y(totals[index])) + 3}
            fill="none"
            stroke-width="2"
            stroke-dasharray="3 2"
            class="stroke-rose-700 dark:stroke-rose-300"
          />
          <text
            x={center(index)}
            y={MARGIN.top - 8}
            text-anchor={index > count / 2 ? 'end' : 'start'}
            class="fill-rose-700 text-[11px] font-semibold dark:fill-rose-300"
          >
            ▼ dangerous
          </text>
        {/if}
      {/each}

      {#if marker && marker.index >= 0 && marker.index < count}
        <line
          x1={center(marker.index)}
          x2={center(marker.index)}
          y1={MARGIN.top - 4}
          y2={bottom}
          stroke-width="2"
          stroke-dasharray="5 4"
          class="stroke-slate-700 dark:stroke-slate-200"
        />
        <text
          x={center(marker.index) + (marker.index > count / 2 ? -5 : 5)}
          y={MARGIN.top - 8}
          text-anchor={marker.index > count / 2 ? 'end' : 'start'}
          stroke-width="3"
          paint-order="stroke"
          class="fill-slate-800 stroke-white text-[11px] font-semibold dark:fill-slate-100 dark:stroke-slate-900"
        >
          {marker.label}
        </text>
      {/if}

      <line
        x1={MARGIN.left}
        x2={MARGIN.left + plotWidth}
        y1={bottom}
        y2={bottom}
        stroke-width="1"
        class="stroke-slate-400 dark:stroke-slate-500"
      />
      {#each categories as category, index (index)}
        {#if shownLabels.has(index)}
          <text
            x={center(index)}
            y={bottom + 15}
            text-anchor="middle"
            class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
          >
            {category}
          </text>
        {/if}
      {/each}
      <text
        x={MARGIN.left + plotWidth / 2}
        y={height - 6}
        text-anchor="middle"
        class="fill-slate-700 text-xs font-medium dark:fill-slate-200"
      >
        {axisTitle}
      </text>

      {#if activeIndex !== null}
        <rect
          x={center(activeIndex) - slot / 2}
          y={MARGIN.top}
          width={slot}
          height={plotHeight}
          class="fill-slate-500/10 dark:fill-slate-300/10"
        />
      {/if}
    </svg>

    {#if activeIndex !== null}
      <div
        role="tooltip"
        data-testid="chart-tooltip"
        class="pointer-events-none absolute top-1 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:width="{TOOLTIP_WIDTH}px"
      >
        <p class="font-semibold">{axisTitle} {categories[activeIndex]}</p>
        <dl class="mt-1 space-y-0.5 tabular-nums">
          {#each series as entry (entry.id)}
            <div class="flex justify-between gap-3">
              <dt>{entry.name}</dt>
              <dd class="font-semibold">{formatValue(entry.values[activeIndex] ?? 0)}</dd>
            </div>
          {/each}
        </dl>
        {#each describe(activeIndex) as line (line)}
          <p class="mt-1">{line}</p>
        {/each}
      </div>
    {/if}
  </div>
</div>
