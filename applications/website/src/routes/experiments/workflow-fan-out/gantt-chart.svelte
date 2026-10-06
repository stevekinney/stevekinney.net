<script lang="ts">
  import { placeTooltip } from '$lib/experiments/tooltip-position';

  import { ganttSegments, timeTicks } from './gantt-geometry';
  import { formatMinutes } from './results';
  import type { Schedule, ScheduledAgent } from './schedule';
  import { stageStyle } from './stage-styles';

  type Props = {
    schedule: Schedule;
    stageNames: string[];
    /** The right edge of the time axis, shared by both charts so they compare directly. */
    maximum: number;
    /** Minutes to draw up to while animating, or null for the finished schedule. */
    until: number | null;
    /** Rows past this many are left to the table. */
    maximumRows: number;
    onResize: (item: number, stage: number, minutes: number) => void;
  };

  const { schedule, stageNames, maximum, until, maximumRows, onResize }: Props = $props();

  const id = $props.id();
  const MARGIN = { top: 22, right: 16, bottom: 30, left: 40 };
  const TOOLTIP_WIDTH = 210;
  /** The chart never draws narrower than this. Narrower screens scroll it sideways. */
  const MINIMUM_WIDTH = 460;

  let measuredWidth = $state(0);
  let scrollLeft = $state(0);
  let activeIndex = $state<number | null>(null);
  let dragging = $state<{ agent: ScheduledAgent; pointerId: number } | null>(null);
  let svgElement = $state<SVGSVGElement | undefined>();

  const rows = $derived(
    Math.min(
      maximumRows,
      schedule.agents.reduce((most, agent) => Math.max(most, agent.item + 1), 0),
    ),
  );
  const rowHeight = $derived(rows <= 12 ? 24 : rows <= 30 ? 16 : 10);
  const width = $derived(Math.max(MINIMUM_WIDTH, measuredWidth || 640));
  const plotWidth = $derived(width - MARGIN.left - MARGIN.right);
  const height = $derived(MARGIN.top + rows * rowHeight + MARGIN.bottom);
  const scale = $derived(maximum > 0 ? plotWidth / maximum : 1);
  const x = (minutes: number): number => MARGIN.left + minutes * scale;
  const y = (item: number): number => MARGIN.top + item * rowHeight;

  const segments = $derived(
    ganttSegments(schedule, until).filter((segment) => segment.agent.item < rows),
  );
  /** Agents with a bar, in reading order, for the arrow keys. */
  const drawn = $derived(
    schedule.agents.filter((agent) => agent.item < rows && agent.start !== null),
  );
  const active = $derived(
    activeIndex === null ? null : (drawn[Math.min(activeIndex, drawn.length - 1)] ?? null),
  );
  const ticks = $derived(timeTicks(maximum));

  const statusText = (agent: ScheduledAgent): string => {
    switch (agent.status) {
      case 'value':
        return 'a value';
      case 'null':
        return 'null (stopped or failed)';
      case 'error':
        return `an error after ${agent.attempts} schema ${agent.attempts === 1 ? 'attempt' : 'attempts'}`;
      case 'abandoned':
        return 'abandoned when the run failed';
      default:
        return agent.status;
    }
  };

  const describe = (agent: ScheduledAgent): string =>
    `Item ${agent.item + 1}, stage ${agent.stage + 1} (${stageNames[agent.stage]}): starts ${formatMinutes(agent.start ?? 0)}, ends ${formatMinutes(agent.end ?? 0)}, returns ${statusText(agent)}.`;

  const valueText = $derived(
    active
      ? describe(active)
      : `${schedule.strategy}() finishes at ${formatMinutes(schedule.makespan)}. Use the arrow keys to read each agent.`,
  );

  const tooltipLeft = $derived(
    active
      ? placeTooltip(
          x(((active.start ?? 0) + (active.end ?? 0)) / 2) - scrollLeft,
          TOOLTIP_WIDTH,
          measuredWidth || width,
        )
      : 0,
  );

  const indexOf = (agent: ScheduledAgent): number =>
    drawn.findIndex((entry) => entry.item === agent.item && entry.stage === agent.stage);

  const agentAt = (event: PointerEvent): ScheduledAgent | null => {
    if (!svgElement) return null;
    const bounds = svgElement.getBoundingClientRect();
    const minutes = (event.clientX - bounds.left - MARGIN.left) / scale;
    const item = Math.floor((event.clientY - bounds.top - MARGIN.top) / rowHeight);

    return (
      drawn.find(
        (agent) =>
          agent.item === item &&
          minutes >= (agent.start ?? 0) &&
          minutes <= (agent.end ?? 0) + 4 / scale,
      ) ?? null
    );
  };

  const minutesAt = (event: PointerEvent, agent: ScheduledAgent): number => {
    const bounds = svgElement!.getBoundingClientRect();
    const minutes = (event.clientX - bounds.left - MARGIN.left) / scale - (agent.start ?? 0);

    return Math.max(0.1, Math.round(minutes * 10) / 10);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (dragging && dragging.pointerId === event.pointerId) {
      onResize(dragging.agent.item, dragging.agent.stage, minutesAt(event, dragging.agent));
      return;
    }
    const agent = agentAt(event);
    activeIndex = agent ? indexOf(agent) : null;
  };

  const startDrag = (event: PointerEvent, agent: ScheduledAgent): void => {
    event.preventDefault();
    event.stopPropagation();
    svgElement?.setPointerCapture(event.pointerId);
    dragging = { agent, pointerId: event.pointerId };
    activeIndex = indexOf(agent);
  };

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    svgElement?.releasePointerCapture(event.pointerId);
    dragging = null;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (drawn.length === 0) return;
    const current = activeIndex ?? 0;
    const agent = drawn[current];

    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      activeIndex = Math.min(drawn.length - 1, Math.max(0, current + step));
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const item = agent.item + (event.key === 'ArrowDown' ? 1 : -1);
      const next = drawn.findIndex((entry) => entry.item === item && entry.stage === agent.stage);
      const fallback = drawn.findIndex((entry) => entry.item === item);
      if (next !== -1 || fallback !== -1) activeIndex = next === -1 ? fallback : next;
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      activeIndex = event.key === 'Home' ? 0 : drawn.length - 1;
    } else if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '_') {
      event.preventDefault();
      const change = event.key === '+' || event.key === '=' ? 0.5 : -0.5;
      onResize(
        agent.item,
        agent.stage,
        Math.max(0.1, Math.round((agent.minutes + change) * 10) / 10),
      );
    }
  };

  const patternId = (stage: number): string => `${id}-stage-${stage}`;
</script>

<div class="relative">
  <div
    class="relative overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700"
    bind:clientWidth={measuredWidth}
    onscroll={(event) => (scrollLeft = event.currentTarget.scrollLeft)}
  >
    <div
      role="slider"
      tabindex="0"
      aria-label="{schedule.strategy}() schedule. Arrow keys move between agents, and plus or minus changes the selected agent’s duration. The schedule table below has the same times."
      aria-valuemin={0}
      aria-valuemax={Math.max(0, drawn.length - 1)}
      aria-valuenow={activeIndex ?? 0}
      aria-valuetext={valueText}
      data-testid="gantt-{schedule.strategy}"
      class="focus-visible:outline-primary-600 touch-pan-x select-none focus-visible:outline-2 focus-visible:-outline-offset-2"
      style:width="{width}px"
      onkeydown={handleKeydown}
      onfocus={() => (activeIndex ??= 0)}
      onblur={() => (activeIndex = null)}
    >
      <svg
        bind:this={svgElement}
        {width}
        {height}
        viewBox="0 0 {width} {height}"
        aria-hidden="true"
        class="block [&_line]:pointer-events-none [&_text]:pointer-events-none"
        onpointermove={handlePointerMove}
        onpointerup={endDrag}
        onpointercancel={endDrag}
        onpointerleave={() => {
          if (!dragging) activeIndex = null;
        }}
      >
        <defs>
          {#each stageNames.map((_, index) => index) as stage (stage)}
            <pattern id={patternId(stage)} width="6" height="6" patternUnits="userSpaceOnUse">
              {#if stageStyle(stage).pattern === 'stripes'}
                <path
                  d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2"
                  class="stroke-white/70 dark:stroke-slate-900/60"
                  stroke-width="1.5"
                />
              {:else if stageStyle(stage).pattern === 'dots'}
                <circle cx="3" cy="3" r="1.2" class="fill-white/80 dark:fill-slate-900/70" />
              {:else if stageStyle(stage).pattern === 'crosshatch'}
                <path
                  d="M0,0 l6,6 M6,0 l-6,6"
                  class="stroke-white/70 dark:stroke-slate-900/60"
                  stroke-width="1"
                />
              {/if}
            </pattern>
          {/each}
          <pattern
            id="{id}-queued"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="5"
              class="stroke-slate-500 dark:stroke-slate-400"
              stroke-width="1.5"
            />
          </pattern>
        </defs>

        {#each ticks as tick (tick)}
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1={MARGIN.top}
            y2={height - MARGIN.bottom}
            class="stroke-slate-200 dark:stroke-slate-700"
            stroke-width="1"
          />
          <text
            x={x(tick)}
            y={height - MARGIN.bottom + 16}
            text-anchor="middle"
            class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300">{tick}</text
          >
        {/each}
        <text
          x={MARGIN.left + plotWidth / 2}
          y={height - 3}
          text-anchor="middle"
          class="fill-slate-700 text-[11px] dark:fill-slate-200">Minutes</text
        >

        {#each Array.from({ length: rows }, (_, item) => item) as item (item)}
          {#if rowHeight >= 16 || item % 5 === 0}
            <text
              x={MARGIN.left - 6}
              y={y(item) + rowHeight / 2}
              text-anchor="end"
              dominant-baseline="middle"
              class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300">#{item + 1}</text
            >
          {/if}
        {/each}

        {#each segments as segment (`${segment.kind}-${segment.agent.item}-${segment.agent.stage}`)}
          {@const top = y(segment.agent.item) + 2}
          {@const barHeight = rowHeight - 4}
          {@const left = x(segment.from)}
          {@const barWidth = Math.max(1, x(segment.to) - x(segment.from))}
          {#if segment.kind === 'idle'}
            <rect
              x={left}
              y={top}
              width={barWidth}
              height={barHeight}
              class="fill-slate-200 dark:fill-slate-700/70"
              data-kind="idle"
            />
          {:else if segment.kind === 'queued'}
            <rect
              x={left}
              y={top}
              width={barWidth}
              height={barHeight}
              fill="url(#{id}-queued)"
              class="stroke-slate-400 dark:stroke-slate-500"
              stroke-width="0.5"
              data-kind="queued"
            />
          {:else}
            {@const agent = segment.agent}
            {@const isActive = active?.item === agent.item && active?.stage === agent.stage}
            <g
              data-kind="run"
              data-item={agent.item}
              data-stage={agent.stage}
              data-status={agent.status}
            >
              <rect
                x={left}
                y={top}
                width={barWidth}
                height={barHeight}
                rx="2"
                class={stageStyle(agent.stage).fill}
                opacity={agent.status === 'abandoned' ? 0.45 : 1}
              />
              <rect
                x={left}
                y={top}
                width={barWidth}
                height={barHeight}
                rx="2"
                fill="url(#{patternId(agent.stage)})"
              />
              {#if agent.status === 'null' || agent.status === 'error' || isActive}
                <rect
                  x={left}
                  y={top}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill="none"
                  stroke-width={isActive ? 2.5 : 2}
                  stroke-dasharray={agent.status === 'null' ? '3 2' : undefined}
                  class={isActive
                    ? 'stroke-slate-900 dark:stroke-white'
                    : 'stroke-red-600 dark:stroke-red-400'}
                />
              {/if}
              {#if barWidth >= 22 && rowHeight >= 16}
                <text
                  x={left + 4}
                  y={top + barHeight / 2}
                  dominant-baseline="middle"
                  class="pointer-events-none fill-white text-[10px] font-bold dark:fill-slate-900"
                  >S{agent.stage + 1}</text
                >
              {/if}
              {#if until === null && agent.status !== 'abandoned'}
                <!-- The keyboard equivalent is + and − on the focused chart. -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <rect
                  x={left + barWidth - 4}
                  y={top}
                  width="8"
                  height={barHeight}
                  fill="transparent"
                  class="cursor-ew-resize"
                  data-handle="{agent.item}-{agent.stage}"
                  onpointerdown={(event) => startDrag(event, agent)}
                />
              {/if}
            </g>
          {/if}
        {/each}

        {#each schedule.barriers as barrier, index (index)}
          <line
            x1={x(barrier)}
            x2={x(barrier)}
            y1={MARGIN.top - 6}
            y2={height - MARGIN.bottom}
            stroke-dasharray="5 3"
            stroke-width="1.5"
            class="stroke-slate-700 dark:stroke-slate-200"
            data-barrier={barrier}
          />
          <text
            x={x(barrier) + 3}
            y={MARGIN.top - 8}
            class="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200">barrier</text
          >
        {/each}

        {#if until === null || until >= schedule.makespan}
          <line
            x1={x(schedule.makespan)}
            x2={x(schedule.makespan)}
            y1={MARGIN.top - 14}
            y2={height - MARGIN.bottom}
            stroke-width="2"
            class={schedule.failure
              ? 'stroke-red-600 dark:stroke-red-400'
              : 'stroke-slate-900 dark:stroke-white'}
          />
          <text
            x={x(schedule.makespan) - 4}
            y={MARGIN.top - 8}
            text-anchor="end"
            class="text-[11px] font-bold tabular-nums {schedule.failure
              ? 'fill-red-700 dark:fill-red-300'
              : 'fill-slate-900 dark:fill-white'}"
            data-testid="makespan-label"
          >
            {schedule.failure ? 'failed at ' : ''}{formatMinutes(schedule.makespan)}
          </text>
        {/if}

        {#if until !== null}
          <line
            x1={x(until)}
            x2={x(until)}
            y1={MARGIN.top}
            y2={height - MARGIN.bottom}
            stroke-width="1"
            class="stroke-primary-600 dark:stroke-primary-400"
          />
        {/if}
      </svg>
    </div>
  </div>

  {#if active}
    <div
      role="tooltip"
      data-testid="gantt-tooltip"
      class="pointer-events-none absolute z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      style:left="{tooltipLeft}px"
      style:top="{y(active.item) + rowHeight + 4}px"
      style:width="{TOOLTIP_WIDTH}px"
    >
      <p class="font-semibold">
        Item {active.item + 1} · stage {active.stage + 1}: {stageNames[active.stage]}
      </p>
      <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
        <dt>Start</dt>
        <dd>{formatMinutes(active.start ?? 0)}</dd>
        <dt>End</dt>
        <dd>{formatMinutes(active.end ?? 0)}</dd>
        {#if (active.start ?? 0) > (active.ready ?? 0)}
          <dt>Queued</dt>
          <dd>{formatMinutes((active.start ?? 0) - (active.ready ?? 0))}</dd>
        {/if}
        <dt>Result</dt>
        <dd>{statusText(active)}</dd>
      </dl>
    </div>
  {/if}
</div>
