<script lang="ts">
  import { formatCost } from '$lib/experiments/format';

  import { placeTooltip } from '$lib/experiments/tooltip-position';
  import type { Replay } from './replay';

  type Props = {
    replay: Replay;
    /** Position in the log of the iteration the chosen governor stops after. */
    stopIndex: number | null;
  };

  const { replay, stopIndex }: Props = $props();

  const LEFT = 52;
  const RIGHT = 12;
  const PANEL = 110;
  const GAP = 44;
  const STRIP = 14;
  const TOOLTIP_WIDTH = 220;
  const UNMEASURED_WIDTH = 640;
  /** Above this many iterations, the per-iteration dots and strip are left out. */
  const DETAILED = 1_500;

  let measuredWidth = $state(0);
  let active = $state<number | null>(null);

  const steps = $derived(replay.iterations);
  const count = $derived(steps.length);
  const width = $derived(Math.max(240, measuredWidth || UNMEASURED_WIDTH));
  const plotWidth = $derived(width - LEFT - RIGHT);
  const band = $derived(plotWidth / Math.max(1, count));
  const detailed = $derived(count <= DETAILED);

  const scoreTop = 30;
  const costTop = $derived(replay.hasScore ? scoreTop + PANEL + GAP : scoreTop);
  const stripTop = $derived(costTop + PANEL + 10);
  const height = $derived(stripTop + (detailed ? STRIP : 0) + 24);

  const x = (index: number): number => LEFT + (index + 0.5) * band;

  const scoreRange = $derived.by(() => {
    const values = steps.flatMap((step) => (step.score === null ? [] : [step.score]));
    if (values.length === 0) return { min: 0, max: 1 };

    let min = values[0];
    let max = values[0];
    for (const value of values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    return min === max ? { min: min - 1, max: max + 1 } : { min, max };
  });
  const costMaximum = $derived(Math.max(0.01, replay.total));

  const yScore = (score: number): number =>
    scoreTop + PANEL - ((score - scoreRange.min) / (scoreRange.max - scoreRange.min)) * PANEL;
  const yCost = (dollars: number): number => costTop + PANEL - (dollars / costMaximum) * PANEL;

  const scorePoints = $derived(
    steps
      .flatMap((step, index) =>
        step.score === null ? [] : [`${x(index).toFixed(1)},${yScore(step.score).toFixed(1)}`],
      )
      .join(' '),
  );
  const costPoints = $derived(
    steps
      .map((step, index) => `${x(index).toFixed(1)},${yCost(step.cumulative).toFixed(1)}`)
      .join(' '),
  );

  const formatScore = (score: number): string => String(Number(score.toFixed(4)));

  const activeStep = $derived(active === null ? null : (steps[active] ?? null));
  const tooltipLeft = $derived(
    active === null ? 0 : placeTooltip(x(active), Math.min(TOOLTIP_WIDTH, width - 8), width),
  );

  const describe = (index: number): string => {
    const step = steps[index];
    if (!step) return '';

    const parts = [
      `Iteration ${step.iteration}`,
      step.score === null ? null : `score ${formatScore(step.score)}`,
      step.kept ? 'kept' : 'not kept',
      step.progress ? 'progress' : `${step.sinceProgress} without progress`,
      step.repeated ? 'repeated failure' : null,
      `${formatCost(step.cumulative)} spent`,
    ];

    return `${parts.filter(Boolean).join(', ')}.`;
  };

  const indexAt = (event: PointerEvent): number | null => {
    const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - bounds.left;
    if (count === 0 || x < 0 || x > width) return null;

    // The margins at either side belong to the nearest iteration.
    return Math.min(count - 1, Math.max(0, Math.floor((x - LEFT) / band)));
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    if (event.key in moves) {
      event.preventDefault();
      active = Math.min(count - 1, Math.max(0, (active ?? -1) + moves[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : count - 1;
    } else if (event.key === 'Escape') {
      active = null;
    }
  };

  const stripClass = (index: number): string => {
    const step = steps[index];
    if (step.repeated) return 'fill-rose-600 dark:fill-rose-400';
    if (step.progress) return 'fill-emerald-600 dark:fill-emerald-400';

    return 'fill-slate-300 dark:fill-slate-600';
  };
</script>

<div
  bind:clientWidth={measuredWidth}
  role="slider"
  tabindex="0"
  aria-label="The replayed run{replay.hasScore
    ? ': score and'
    : ':'} cumulative cost per iteration. Arrow keys move between iterations."
  aria-valuemin={1}
  aria-valuemax={Math.max(1, count)}
  aria-valuenow={(active ?? 0) + 1}
  aria-valuetext={active === null
    ? `${count} iterations, ${formatCost(replay.total)} in total.`
    : describe(active)}
  data-testid="replay-chart"
  class="focus-visible:outline-primary-600 relative cursor-crosshair touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2"
  onpointermove={(event) => (active = indexAt(event))}
  onpointerdown={(event) => (active = indexAt(event))}
  onpointerleave={() => (active = null)}
  onkeydown={handleKeydown}
  onfocus={() => (active ??= 0)}
  onblur={() => (active = null)}
>
  <svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true" class="block max-w-full">
    {#if stopIndex !== null}
      <rect
        x={LEFT + (stopIndex + 1) * band}
        y={scoreTop}
        width={Math.max(0, plotWidth - (stopIndex + 1) * band)}
        height={stripTop - scoreTop + (detailed ? STRIP : 0)}
        class="fill-sky-500/10 dark:fill-sky-400/15"
      />
      <line
        x1={LEFT + (stopIndex + 1) * band}
        x2={LEFT + (stopIndex + 1) * band}
        y1={scoreTop - 6}
        y2={stripTop + (detailed ? STRIP : 0)}
        stroke-width="2"
        stroke-dasharray="4 3"
        class="stroke-sky-700 dark:stroke-sky-300"
      />
    {/if}

    {#if replay.hasScore}
      <text
        x={4}
        y={scoreTop - 16}
        class="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200">Score</text
      >
      <text
        x={LEFT - 6}
        y={scoreTop + 4}
        text-anchor="end"
        class="fill-slate-600 text-[10px] tabular-nums dark:fill-slate-300"
        >{formatScore(scoreRange.max)}</text
      >
      <text
        x={LEFT - 6}
        y={scoreTop + PANEL}
        text-anchor="end"
        class="fill-slate-600 text-[10px] tabular-nums dark:fill-slate-300"
        >{formatScore(scoreRange.min)}</text
      >
      <line
        x1={LEFT}
        x2={LEFT + plotWidth}
        y1={scoreTop + PANEL}
        y2={scoreTop + PANEL}
        class="stroke-slate-200 dark:stroke-slate-700"
      />
      <polyline
        points={scorePoints}
        fill="none"
        stroke-width="2"
        class="stroke-primary-600 dark:stroke-primary-400"
      />
      {#if detailed}
        {#each steps as step, index (index)}
          {#if step.progress && step.score !== null}
            <circle
              cx={x(index)}
              cy={yScore(step.score)}
              r="3.5"
              class="fill-emerald-600 dark:fill-emerald-400"
            />
          {/if}
        {/each}
      {/if}
    {/if}

    <text
      x={4}
      y={costTop - 16}
      class="fill-slate-700 text-[11px] font-semibold dark:fill-slate-200">Cumulative cost</text
    >
    <text
      x={LEFT - 6}
      y={costTop + 4}
      text-anchor="end"
      class="fill-slate-600 text-[10px] tabular-nums dark:fill-slate-300"
      >{formatCost(costMaximum)}</text
    >
    <text
      x={LEFT - 6}
      y={costTop + PANEL}
      text-anchor="end"
      class="fill-slate-600 text-[10px] tabular-nums dark:fill-slate-300">$0</text
    >
    <line
      x1={LEFT}
      x2={LEFT + plotWidth}
      y1={costTop + PANEL}
      y2={costTop + PANEL}
      class="stroke-slate-200 dark:stroke-slate-700"
    />
    <polyline
      points={costPoints}
      fill="none"
      stroke-width="2"
      class="stroke-rose-600 dark:stroke-rose-400"
    />

    {#if detailed}
      {#each steps as _, index (index)}
        <rect
          x={LEFT + index * band + (band > 3 ? 0.5 : 0)}
          y={stripTop}
          width={Math.max(0.5, band - (band > 3 ? 1 : 0))}
          height={STRIP}
          class={stripClass(index)}
        />
      {/each}
    {/if}
    <text
      x={LEFT}
      y={height - 6}
      class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
      >{steps[0]?.iteration ?? ''}</text
    >
    <text
      x={LEFT + plotWidth}
      y={height - 6}
      text-anchor="end"
      class="fill-slate-600 text-[11px] tabular-nums dark:fill-slate-300"
      >{steps.at(-1)?.iteration ?? ''}</text
    >
    <text
      x={LEFT + plotWidth / 2}
      y={height - 6}
      text-anchor="middle"
      class="fill-slate-700 text-xs font-medium dark:fill-slate-200">Iteration</text
    >

    {#if active !== null}
      <line
        x1={x(active)}
        x2={x(active)}
        y1={scoreTop}
        y2={stripTop}
        class="stroke-slate-500 dark:stroke-slate-400"
      />
    {/if}
  </svg>

  {#if activeStep && active !== null}
    <div
      role="tooltip"
      data-testid="replay-tooltip"
      class="pointer-events-none absolute top-6 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
      style:left="{tooltipLeft}px"
      style:width="{Math.min(TOOLTIP_WIDTH, width - 8)}px"
    >
      <p class="font-semibold">{describe(active)}</p>
      {#if activeStep.failure}
        <p class="mt-1 [overflow-wrap:anywhere]">Failure: {activeStep.failure}</p>
      {/if}
      {#if activeStep.session}
        <p class="mt-1 [overflow-wrap:anywhere] text-slate-500 dark:text-slate-400">
          Session {activeStep.session}
        </p>
      {/if}
    </div>
  {/if}
</div>
{#if detailed}
  <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    <li class="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        class="inline-block size-3 rounded-sm bg-emerald-600 dark:bg-emerald-400"
      ></span>Progress: kept and the score improved
    </li>
    <li class="flex items-center gap-1.5">
      <span aria-hidden="true" class="inline-block size-3 rounded-sm bg-slate-300 dark:bg-slate-600"
      ></span>Stall
    </li>
    <li class="flex items-center gap-1.5">
      <span aria-hidden="true" class="inline-block size-3 rounded-sm bg-rose-600 dark:bg-rose-400"
      ></span>Repeated failure
    </li>
  </ul>
{:else}
  <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
    This log is long, so the chart leaves out the per-iteration marks.
  </p>
{/if}
