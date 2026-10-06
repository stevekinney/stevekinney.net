<script lang="ts">
  import { schedule, SLOW_FIRST_SLOW_LAST, STAGE_NAMES, totalWork } from './pipelining';
  import type { Handoff } from './pipelining';
  import ToggleGroup from './toggle-group.svelte';

  type Props = { ready: boolean };

  const { ready }: Props = $props();

  let handoff = $state<Handoff>('barrier');

  const grid = SLOW_FIRST_SLOW_LAST;
  const work = totalWork(grid);
  const result = $derived(schedule(grid, handoff));
  // Both views share one axis, so the bars visibly move when the toggle flips.
  const axisMinutes = schedule(grid, 'barrier').makespan;
  const ticks = Array.from({ length: axisMinutes / 5 + 1 }, (_, index) => index * 5);

  const percent = (minutes: number): string => `${(minutes / axisMinutes) * 100}%`;

  const stageClasses = [
    'bg-sky-600 dark:bg-sky-400',
    'bg-amber-500 dark:bg-amber-300 bg-[repeating-linear-gradient(135deg,transparent_0_4px,rgb(0_0_0/0.18)_4px_7px)]',
  ];

  const summary = $derived(
    handoff === 'barrier'
      ? `Finishes in ${result.makespan} minutes. Every item waits at minute ${result.barriers[0]} for the slow first item, then the slow last item runs alone.`
      : `Finishes in ${result.makespan} minutes. The quick items finish while the slow ones are still running, so the two slow agents overlap.`,
  );
</script>

<div class="space-y-4">
  <ToggleGroup
    id="handoff"
    label="Between stages"
    value={handoff}
    disabled={!ready}
    options={[
      { value: 'barrier', label: 'Wait for every item' },
      { value: 'pipeline', label: 'Pass each item along' },
    ]}
    onChange={(value) => (handoff = value as Handoff)}
  />

  <p class="text-lg font-semibold text-slate-900 dark:text-white" data-testid="handoff-result">
    {summary}
  </p>

  <figure class="space-y-2" data-testid="pipeline-gantt" data-handoff={handoff}>
    <ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
      {#each STAGE_NAMES as name, stage (name)}
        <li class="flex items-center gap-2">
          <span aria-hidden="true" class="inline-block h-3 w-6 rounded-sm {stageClasses[stage]}"
          ></span>
          {name} (stage {stage + 1})
        </li>
      {/each}
    </ul>

    <div aria-hidden="true" class="space-y-1.5">
      {#each grid as row, item (item)}
        <div class="flex items-center gap-2">
          <span class="w-14 flex-none text-xs text-slate-600 dark:text-slate-300">
            Item {item + 1}
          </span>
          <div class="relative h-6 min-w-0 flex-1 rounded bg-slate-100 dark:bg-slate-800">
            {#each result.bars.filter((bar) => bar.item === item) as bar (bar.stage)}
              <div
                class="absolute inset-y-0.5 rounded-sm transition-[left] duration-300 motion-reduce:transition-none {stageClasses[
                  bar.stage
                ]}"
                style:left={percent(bar.start)}
                style:width={percent(row[bar.stage])}
              ></div>
            {/each}
            {#each result.barriers as barrier (barrier)}
              <div
                class="absolute -inset-y-1 w-0.5 bg-slate-900 dark:bg-white"
                style:left={percent(barrier)}
              ></div>
            {/each}
          </div>
        </div>
      {/each}

      <div class="flex gap-2">
        <span class="w-14 flex-none"></span>
        <div
          class="relative h-5 min-w-0 flex-1 text-xs text-slate-600 tabular-nums dark:text-slate-300"
        >
          {#each ticks as tick (tick)}
            <span
              class="absolute top-0 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style:left={percent(tick)}>{tick}</span
            >
          {/each}
        </div>
      </div>
    </div>

    <figcaption class="text-sm text-slate-600 dark:text-slate-300">
      Four items, two stages, {work} minutes of agent work. Item 1 takes 1 minute to find and 10 to fix;
      item 4 takes 10 to find and 1 to fix; the others take 1 minute each. Minutes along the bottom.
    </figcaption>
  </figure>
</div>
