<script lang="ts">
  import { Pause, Play, RotateCcw } from '@lucide/svelte';
  import { onDestroy } from 'svelte';

  import Button from '$lib/components/button';

  import { bodyClasses, codeClasses } from './field-styles';
  import GanttChart from './gantt-chart.svelte';
  import { formatMinutes } from './results';
  import type { StrategyRun } from './run';
  import ScheduleTable from './schedule-table.svelte';
  import type { Strategy } from './schedule';
  import { stageStyle } from './stage-styles';
  import { compareMakespans } from './summary';

  type Props = {
    runs: Record<Strategy, StrategyRun>;
    stageNames: string[];
    ready: boolean;
    onResize: (item: number, stage: number, minutes: number) => void;
  };

  const { runs, stageNames, ready, onResize }: Props = $props();

  const MAXIMUM_ROWS = 60;
  /** How long the animation takes from start to finish, whatever the makespan. */
  const ANIMATION_MILLISECONDS = 4_000;

  const maximum = $derived(
    Math.max(runs.pipeline.schedule.makespan, runs.parallel.schedule.makespan, 0.1),
  );
  const items = $derived(
    runs.pipeline.schedule.agents.reduce((most, agent) => Math.max(most, agent.item + 1), 0),
  );

  let until = $state<number | null>(null);
  let playing = $state(false);
  let frame = 0;

  const stop = (): void => {
    cancelAnimationFrame(frame);
    playing = false;
  };

  const play = (): void => {
    // Reduced motion shows the finished schedule at once.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      until = null;
      return;
    }

    const startedFrom = until !== null && until < maximum ? until : 0;
    const startedAt = performance.now() - (startedFrom / maximum) * ANIMATION_MILLISECONDS;
    playing = true;

    const step = (now: number): void => {
      const elapsed = (now - startedAt) / ANIMATION_MILLISECONDS;
      if (elapsed >= 1) {
        until = null;
        playing = false;
        return;
      }
      until = Math.round(elapsed * maximum * 10) / 10;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  onDestroy(stop);

  const strategies: { id: Strategy; title: string; caption: string }[] = [
    {
      id: 'pipeline',
      title: 'pipeline()',
      caption: 'Each item moves to its next stage as soon as its own agent finishes.',
    },
    {
      id: 'parallel',
      title: 'parallel() per stage',
      caption: 'Every item waits at the barrier until the slowest item of the stage finishes.',
    },
  ];
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center gap-3">
    <Button
      variant="secondary"
      size="small"
      icon={playing ? Pause : Play}
      disabled={!ready}
      onclick={() => (playing ? stop() : play())}
    >
      {playing ? 'Pause' : 'Play'}
    </Button>
    {#if until !== null}
      <Button
        variant="secondary"
        size="small"
        icon={RotateCcw}
        onclick={() => {
          stop();
          until = null;
        }}
      >
        Show the finished schedule
      </Button>
      <span class="text-sm text-slate-700 tabular-nums dark:text-slate-200" aria-live="off">
        {formatMinutes(until)}
      </span>
    {/if}
  </div>

  <ul
    class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200"
    aria-label="Legend"
  >
    {#each stageNames as name, stage (stage)}
      <li class="flex items-center gap-2">
        <span aria-hidden="true" class="inline-block h-3 w-5 rounded-sm {stageStyle(stage).swatch}"
        ></span>
        S{stage + 1}: {name} ({stageStyle(stage).patternName})
      </li>
    {/each}
    <li class="flex items-center gap-2">
      <span
        aria-hidden="true"
        class="inline-block h-3 w-5 rounded-sm border border-slate-400 bg-[repeating-linear-gradient(45deg,var(--color-slate-400)_0_2px,transparent_2px_5px)]"
      ></span>
      Queued for a slot (hatched)
    </li>
    <li class="flex items-center gap-2">
      <span
        aria-hidden="true"
        class="inline-block h-3 w-5 rounded-sm bg-slate-200 dark:bg-slate-700"
      ></span>
      Idle at a barrier
    </li>
    <li class="flex items-center gap-2">
      <span
        aria-hidden="true"
        class="inline-block h-3 w-5 rounded-sm border-2 border-dashed border-red-600 dark:border-red-400"
      ></span>
      Null or error
    </li>
  </ul>

  <p class="font-semibold text-slate-900 dark:text-white" data-testid="makespan-comparison">
    {compareMakespans(
      runs.pipeline.schedule.makespan,
      runs.parallel.schedule.makespan,
      stageNames.length,
    )}
  </p>

  <div class="grid gap-6 lg:grid-cols-2">
    {#each strategies as strategy (strategy.id)}
      {@const schedule = runs[strategy.id].schedule}
      <figure class="min-w-0 space-y-2" aria-labelledby="{strategy.id}-caption">
        <figcaption id="{strategy.id}-caption" class="space-y-0.5">
          <span class="block font-semibold text-slate-900 dark:text-white">
            <code class={codeClasses}>{strategy.title}</code>:
            <span data-testid="makespan-{strategy.id}">{formatMinutes(schedule.makespan)}</span>
          </span>
          <span class="block {bodyClasses}">{strategy.caption}</span>
        </figcaption>
        <GanttChart
          {schedule}
          {stageNames}
          {maximum}
          {until}
          maximumRows={MAXIMUM_ROWS}
          {onResize}
        />
      </figure>
    {/each}
  </div>

  <p class={bodyClasses}>
    Hover a bar, or focus a chart and use the arrow keys, to read it. Drag a bar’s right edge, or
    press + or − on a selected bar, to change its duration; the durations switch to the manual grid
    and both charts recompute.
    {#if items > MAXIMUM_ROWS}
      The charts draw the first {MAXIMUM_ROWS} of {items} items; the table has every agent.
    {/if}
  </p>

  <ScheduleTable {runs} {stageNames} />
</div>
