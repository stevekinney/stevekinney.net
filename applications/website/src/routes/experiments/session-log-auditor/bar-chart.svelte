<script lang="ts" module>
  export type BarSegment = { key: string; label: string; value: number; fill: string };
  export type Bar = {
    id: string;
    /** The x-axis label, such as a day. */
    label: string;
    segments: BarSegment[];
    /** A line under the tooltip's heading, such as “after the fix”. */
    note?: string;
    /** Draw this bar faded, such as a day before a fix. */
    muted?: boolean;
  };
</script>

<script lang="ts">
  type Props = {
    bars: Bar[];
    /** Describes the chart, and names the table that has the same numbers. */
    label: string;
    testId: string;
    formatValue?: (value: number) => string;
    /** A dashed vertical line before this bar, such as a fix date. */
    markerBefore?: string | null;
    markerLabel?: string;
    /** The largest value on the y axis, such as 1 for a ratio. Defaults to the tallest bar. */
    maximum?: number;
    height?: number;
  };

  const {
    bars,
    label,
    testId,
    formatValue = (value: number) => String(value),
    markerBefore = null,
    markerLabel = '',
    maximum,
    height = 200,
  }: Props = $props();

  const MARGIN = { top: 12, right: 8, bottom: 28, left: 40 };
  const UNMEASURED_WIDTH = 640;

  let measuredWidth = $state(0);
  let tooltipWidth = $state(0);
  let active = $state<number | null>(null);

  const width = $derived(Math.max(200, measuredWidth || UNMEASURED_WIDTH));
  const plotWidth = $derived(width - MARGIN.left - MARGIN.right);
  const plotHeight = $derived(height - MARGIN.top - MARGIN.bottom);
  const totals = $derived(
    bars.map((bar) => bar.segments.reduce((sum, segment) => sum + segment.value, 0)),
  );
  const top = $derived(maximum ?? Math.max(1, ...totals));
  const slot = $derived(bars.length > 0 ? plotWidth / bars.length : plotWidth);
  const barWidth = $derived(Math.max(1, Math.min(28, slot * 0.8)));

  const x = (index: number): number => MARGIN.left + index * slot + (slot - barWidth) / 2;
  const y = (value: number): number => MARGIN.top + plotHeight - (value / top) * plotHeight;

  const stacks = $derived(
    bars.map((bar) => {
      let base = 0;

      return bar.segments
        .filter((segment) => segment.value > 0)
        .map((segment) => {
          const rect = {
            ...segment,
            y: y(base + segment.value),
            height: (segment.value / top) * plotHeight,
          };
          base += segment.value;

          return rect;
        });
    }),
  );

  // Label at most about eight bars along the axis, always the first and last.
  const labelEvery = $derived(
    Math.max(1, Math.ceil(bars.length / Math.max(2, Math.floor(plotWidth / 80)))),
  );
  const showLabel = (index: number): boolean =>
    index === 0 || index === bars.length - 1
      ? true
      : index % labelEvery === 0 && bars.length - 1 - index >= labelEvery / 2;

  const markerIndex = $derived(
    markerBefore === null ? -1 : bars.findIndex((bar) => bar.id > markerBefore),
  );

  const activeBar = $derived(active === null ? null : bars[active]);

  // Centered on the bar, then held inside the chart so it can never widen a narrow page.
  const tooltipLeft = $derived.by(() => {
    if (active === null) return 0;

    const anchor = x(active) + barWidth / 2;
    const room = Math.max(0, width - tooltipWidth);

    return Math.min(room, Math.max(0, anchor - tooltipWidth / 2));
  });

  const describe = (index: number): string => {
    const bar = bars[index];
    const parts = bar.segments
      .filter((segment) => segment.value > 0)
      .map((segment) => `${segment.label} ${formatValue(segment.value)}`);

    return `${bar.label}: ${parts.length > 0 ? parts.join(', ') : 'none'}${bar.note ? `, ${bar.note}` : ''}`;
  };

  const indexAt = (event: PointerEvent): number => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left - MARGIN.left) / slot);

    return Math.min(bars.length - 1, Math.max(0, index));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (bars.length === 0) return;

    const current = active ?? 0;
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };

    if (event.key in steps) {
      event.preventDefault();
      active = Math.min(bars.length - 1, Math.max(0, current + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : bars.length - 1;
    }
  };

  const gridlines = $derived([0, 0.5, 1].map((share) => share * top));
</script>

<div
  bind:clientWidth={measuredWidth}
  role="slider"
  tabindex="0"
  aria-label="{label} Arrow keys move between bars."
  aria-valuemin={0}
  aria-valuemax={Math.max(0, bars.length - 1)}
  aria-valuenow={active ?? 0}
  aria-valuetext={bars.length === 0 ? 'No data' : describe(active ?? 0)}
  data-testid={testId}
  class="focus-visible:outline-primary-600 relative touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
  onpointermove={(event) => (active = indexAt(event))}
  onpointerdown={(event) => (active = indexAt(event))}
  onpointerleave={() => (active = null)}
  onkeydown={handleKeydown}
  onfocus={() => (active ??= 0)}
  onblur={() => (active = null)}
>
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true" class="block max-w-full">
    {#each gridlines as value (value)}
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
        {formatValue(value)}
      </text>
    {/each}

    {#each stacks as stack, index (bars[index].id)}
      {#if active === index}
        <rect
          x={MARGIN.left + index * slot}
          y={MARGIN.top}
          width={slot}
          height={plotHeight}
          class="fill-slate-100 dark:fill-slate-800"
        />
      {/if}
      {#each stack as segment (segment.key)}
        <rect
          x={x(index)}
          y={segment.y}
          width={barWidth}
          height={Math.max(0.5, segment.height)}
          opacity={bars[index].muted ? 0.45 : 1}
          class={segment.fill}
        />
      {/each}
      {#if showLabel(index)}
        <text
          x={x(index) + barWidth / 2}
          y={height - 8}
          text-anchor={index === 0 ? 'start' : index === bars.length - 1 ? 'end' : 'middle'}
          class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
        >
          {bars[index].label}
        </text>
      {/if}
    {/each}

    {#if markerIndex > 0}
      <line
        x1={MARGIN.left + markerIndex * slot}
        x2={MARGIN.left + markerIndex * slot}
        y1={MARGIN.top}
        y2={MARGIN.top + plotHeight}
        stroke-dasharray="4 3"
        stroke-width="1.5"
        class="stroke-slate-700 dark:stroke-slate-200"
      />
      {#if markerLabel}
        <text
          x={MARGIN.left + markerIndex * slot + (markerIndex > bars.length / 2 ? -4 : 4)}
          y={MARGIN.top + 10}
          text-anchor={markerIndex > bars.length / 2 ? 'end' : 'start'}
          class="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200"
        >
          {markerLabel}
        </text>
      {/if}
    {/if}
  </svg>

  {#if activeBar}
    <div
      bind:clientWidth={tooltipWidth}
      role="tooltip"
      data-testid="{testId}-tooltip"
      class="pointer-events-none absolute top-1 z-10 max-w-[min(15rem,100%)] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      style:left="{tooltipLeft}px"
    >
      <p class="font-semibold">{activeBar.label}</p>
      {#if activeBar.note}<p class="text-slate-600 dark:text-slate-300">{activeBar.note}</p>{/if}
      <dl class="mt-1 space-y-0.5 tabular-nums">
        {#each activeBar.segments.filter((segment) => segment.value > 0) as segment (segment.key)}
          <div class="flex items-center justify-between gap-3">
            <dt class="flex min-w-0 items-center gap-1.5">
              <svg aria-hidden="true" width="8" height="8" class="flex-none">
                <rect width="8" height="8" class={segment.fill} />
              </svg>
              <span class="[overflow-wrap:anywhere]">{segment.label}</span>
            </dt>
            <dd class="font-semibold">{formatValue(segment.value)}</dd>
          </div>
        {:else}
          <div>
            <dt class="sr-only">Value</dt>
            <dd>None</dd>
          </div>
        {/each}
      </dl>
    </div>
  {/if}
</div>
