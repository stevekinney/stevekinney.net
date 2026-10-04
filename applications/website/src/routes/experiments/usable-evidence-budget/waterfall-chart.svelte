<script lang="ts">
  import { onMount } from 'svelte';

  import { formatTokens, usable } from './budget';
  import type { Scenario } from './budget';
  import { getReady } from './ready-context';
  import { chartHeight, chartWidth, describeColumn } from './waterfall';
  import type { ColumnKey, Waterfall } from './waterfall';

  type Props = {
    chart: Waterfall;
    scenario: Scenario;
    pinned: Scenario | null;
    /** Whether any evidence is drawn, so the legend can say what it is. */
    hasEvidence: boolean;
    onActivate: (key: ColumnKey) => void;
    svg?: SVGSVGElement | undefined;
  };

  let { chart, scenario, pinned, hasEvidence, onActivate, svg = $bindable() }: Props = $props();

  const isReady = getReady();

  let region: HTMLDivElement | undefined = $state();
  let active = $state<{ key: ColumnKey; x: number; top: number; bottom: number } | null>(null);
  let activeTarget: Element | null = null;

  const detail = $derived(active ? describeColumn(active.key, scenario) : null);

  // On a narrow screen the chart scrolls inside its own region. Usable is the
  // bar that matters, and it is the last one, so the region opens scrolled to it.
  onMount(() => {
    if (region && region.scrollWidth > region.clientWidth) {
      region.scrollLeft = region.scrollWidth - region.clientWidth;
    }
  });

  // The tooltip points at the bar, not at the taller area around it that catches the pointer.
  const place = (key: ColumnKey, target: Element): void => {
    const box = (target.querySelector('[data-bar]') ?? target).getBoundingClientRect();

    active = { key, x: box.left + box.width / 2, top: box.top, bottom: box.bottom };
  };

  const show = (key: ColumnKey, target: Element): void => {
    activeTarget = target;
    place(key, target);
  };

  const hide = (): void => {
    active = null;
    activeTarget = null;
  };

  // Scrolling moves the bar out from under a tooltip that is fixed to the screen, so it follows.
  const follow = (): void => {
    if (active && activeTarget) place(active.key, activeTarget);
  };

  const press = (event: KeyboardEvent, key: ColumnKey): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(key);
    }
  };

  const tooltipWidth = 256;

  // Keeps the tooltip on screen: clamped sideways, and below the bar when there is no room above.
  const tooltipStyle = $derived.by(() => {
    if (!active) return '';

    const half = tooltipWidth / 2 + 8;
    const left = Math.min(Math.max(active.x, half), Math.max(window.innerWidth - half, half));
    const above = active.top > 150;

    return above
      ? `left:${left}px;top:${active.top - 8}px;transform:translate(-50%,-100%)`
      : `left:${left}px;top:${active.bottom + 8}px;transform:translateX(-50%)`;
  });

  const barClass = (key: ColumnKey, over: boolean): string => {
    if (key === 'capacity') return 'fill-primary-200 dark:fill-primary-900';
    if (key === 'usable') {
      return over ? 'fill-red-600 dark:fill-red-400' : 'fill-primary-800 dark:fill-primary-300';
    }

    return 'fill-primary-400 dark:fill-primary-600';
  };

  const summary = $derived(
    `Waterfall chart. A context capacity of ${formatTokens(scenario.capacity)} falls to a usable evidence budget of ${formatTokens(usable(scenario))} after five draws. The same figures are in the table below.`,
  );
</script>

<div class="space-y-3">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div
    bind:this={region}
    class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
    tabindex="0"
    role="region"
    aria-label="Waterfall chart of where the window goes"
    data-testid="chart-region"
  >
    <svg
      bind:this={svg}
      viewBox="0 0 {chartWidth} {chartHeight}"
      role="group"
      aria-label={summary}
      class="mx-auto block h-auto w-full max-w-4xl min-w-[40rem] select-none"
      data-testid="waterfall"
    >
      {#each chart.axis.ticks as tick (tick.value)}
        <line
          x1="56"
          x2="628"
          y1={tick.y}
          y2={tick.y}
          class="stroke-slate-200 dark:stroke-slate-700"
          stroke-width="1"
        />
        <text
          x="48"
          y={tick.y + 4}
          text-anchor="end"
          class="fill-slate-500 text-[11px] tabular-nums dark:fill-slate-400"
        >
          {tick.label}
        </text>
      {/each}

      {#if chart.axis.hasNegative}
        <line
          x1="56"
          x2="628"
          y1={chart.axis.zeroY}
          y2={chart.axis.zeroY}
          class="stroke-slate-700 dark:stroke-slate-300"
          stroke-width="2"
          data-testid="zero-line"
        />
      {/if}

      {#if chart.ghosts}
        {#each chart.ghosts as ghost, index (index)}
          <rect
            x={ghost.x - 3}
            y={ghost.y - 1}
            width={ghost.width + 6}
            height={ghost.height + 2}
            fill="none"
            stroke-width="1.5"
            stroke-dasharray="5 3"
            class="stroke-slate-500 dark:stroke-slate-400"
            data-ghost
          />
        {/each}
      {/if}

      {#each chart.connectors as connector, index (index)}
        <line
          x1={connector.x1}
          x2={connector.x2}
          y1={connector.y}
          y2={connector.y}
          stroke-width="1"
          stroke-dasharray="3 3"
          class="stroke-slate-400 dark:stroke-slate-500"
        />
      {/each}

      {#each chart.columns as column (column.key)}
        <g
          role="button"
          tabindex={isReady() ? 0 : -1}
          aria-label="{column.name}, {column.valueLabel}. {column.key === 'usable'
            ? 'Go to the evidence check.'
            : column.key === 'capacity'
              ? 'Change the capacity.'
              : 'Adjust this term.'}"
          aria-describedby={active?.key === column.key ? 'chart-tooltip' : undefined}
          data-column={column.key}
          class="group cursor-pointer outline-none"
          onpointerenter={(event) => show(column.key, event.currentTarget)}
          onpointerleave={hide}
          onfocus={(event) => show(column.key, event.currentTarget)}
          onblur={hide}
          onclick={() => onActivate(column.key)}
          onkeydown={(event) => press(event, column.key)}
        >
          <rect
            x={column.hit.x}
            y={column.hit.y}
            width={column.hit.width}
            height={column.hit.height}
            fill="transparent"
          />
          <rect
            data-bar
            x={column.rect.x}
            y={column.rect.y}
            width={column.rect.width}
            height={column.rect.height}
            rx="2"
            class="{barClass(column.key, column.over)} group-hover:opacity-80"
          />
          <rect
            x={column.rect.x - 3}
            y={column.rect.y - 3}
            width={column.rect.width + 6}
            height={column.rect.height + 6}
            rx="4"
            fill="none"
            stroke-width="2.5"
            class="stroke-transparent group-focus-visible:stroke-slate-900 dark:group-focus-visible:stroke-white"
          />
          <text
            x={column.center}
            y={column.valueLabelY}
            text-anchor="middle"
            class="text-[12px] font-semibold tabular-nums {column.over
              ? 'fill-red-700 dark:fill-red-400'
              : 'fill-slate-900 dark:fill-white'}"
          >
            {column.valueLabel}
          </text>
        </g>
      {/each}

      {#if chart.evidenceFit}
        <rect
          x={chart.evidenceFit.x}
          y={chart.evidenceFit.y}
          width={chart.evidenceFit.width}
          height={chart.evidenceFit.height}
          stroke-width="1.5"
          class="fill-primary-300 dark:fill-primary-700 stroke-white dark:stroke-slate-900"
          data-evidence="fit"
          pointer-events="none"
        />
      {/if}
      {#if chart.evidenceOverflow}
        <rect
          x={chart.evidenceOverflow.x}
          y={chart.evidenceOverflow.y}
          width={chart.evidenceOverflow.width}
          height={chart.evidenceOverflow.height}
          rx="2"
          class="fill-amber-500 dark:fill-amber-400"
          data-evidence="overflow"
          pointer-events="none"
        />
      {/if}

      {#each chart.columns as column (column.key)}
        <text
          y={chart.labelY}
          text-anchor="middle"
          class="fill-slate-700 text-[11px] dark:fill-slate-300"
          pointer-events="none"
        >
          {#each column.lines as line, index (index)}
            <tspan x={column.center} dy={index === 0 ? 0 : 13}>{line}</tspan>
          {/each}
        </text>
      {/each}
    </svg>
  </div>

  <ul class="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600 dark:text-slate-300">
    <li class="flex items-center gap-2">
      <span class="bg-primary-200 dark:bg-primary-900 size-3 rounded-sm" aria-hidden="true"></span>
      Capacity
    </li>
    <li class="flex items-center gap-2">
      <span class="bg-primary-400 dark:bg-primary-600 size-3 rounded-sm" aria-hidden="true"></span>
      Draws against it
    </li>
    <li class="flex items-center gap-2">
      <span class="bg-primary-800 dark:bg-primary-300 size-3 rounded-sm" aria-hidden="true"></span>
      Usable
    </li>
    <li class="flex items-center gap-2">
      <span class="size-3 rounded-sm bg-red-600 dark:bg-red-400" aria-hidden="true"></span>
      Usable when nothing is left
    </li>
    {#if hasEvidence}
      <li class="flex items-center gap-2">
        <span
          class="bg-primary-300 dark:bg-primary-700 size-3 rounded-sm ring-1 ring-slate-400"
          aria-hidden="true"
        ></span>
        Your evidence (estimated)
      </li>
      <li class="flex items-center gap-2">
        <span class="size-3 rounded-sm bg-amber-500 dark:bg-amber-400" aria-hidden="true"></span>
        Evidence past the budget
      </li>
    {/if}
    {#if pinned}
      <li class="flex items-center gap-2">
        <span
          class="size-3 rounded-sm border-2 border-dashed border-slate-500 dark:border-slate-400"
          aria-hidden="true"
        ></span>
        Pinned scenario A
      </li>
    {/if}
  </ul>
</div>

<svelte:window onkeydown={(event) => event.key === 'Escape' && hide()} onscroll={follow} />

{#if active && detail}
  <div
    id="chart-tooltip"
    role="tooltip"
    style={tooltipStyle}
    class="pointer-events-none fixed z-30 w-64 space-y-1 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
    data-testid="chart-tooltip"
  >
    <p class="text-sm font-semibold">{detail.title}</p>
    <p class="tabular-nums">{detail.value}, {detail.share}</p>
    <p>{detail.description}</p>
  </div>
{/if}
