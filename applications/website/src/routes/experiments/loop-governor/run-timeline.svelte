<script lang="ts">
  import { Hand, Pause, Play, SkipForward, RotateCcw } from '@lucide/svelte';
  import { onMount, untrack } from 'svelte';

  import Button from '$lib/components/button';
  import { formatCost } from '$lib/experiments/format';

  import { placeTooltip } from '../cache-break-even/tooltip-position';
  import { bodyClasses } from './field-styles';
  import { outcomeStyles, stopReasonLabels } from './labels';
  import type { Config } from './loop-config';
  import { sampleRun } from './simulate';
  import { MAXIMUM_CELLS, STEP_MILLISECONDS, eventStyles } from './timeline';

  type Props = { config: Config; ready: boolean };

  const { config, ready }: Props = $props();

  const CELL = 22;
  const LINE_HEIGHT = 64;
  const TOOLTIP_WIDTH = 210;

  let stopTouchedBefore = $state<number | null>(null);
  let shown = $state(0);
  let playing = $state(false);
  let reducedMotion = $state(false);
  let ignoredTouch = $state(false);
  let active = $state<number | null>(null);
  let viewportWidth = $state(0);
  let scroller: HTMLDivElement | undefined = $state();

  const run = $derived(sampleRun(config, stopTouchedBefore));
  const records = $derived(run.records ?? []);
  const total = $derived(records.length);
  const visible = $derived(records.slice(0, Math.min(shown, MAXIMUM_CELLS)));
  const finished = $derived(shown >= total);
  const maximumCost = $derived(Math.max(0.01, run.cost));

  // A new configuration starts a new sample run.
  $effect(() => {
    void config;

    untrack(() => {
      stopTouchedBefore = null;
      ignoredTouch = false;
      playing = false;
      active = null;
      shown = reducedMotion ? Number.POSITIVE_INFINITY : 0;
    });
  });

  onMount(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = (): void => {
      reducedMotion = query.matches;
      if (reducedMotion) {
        playing = false;
        shown = Number.POSITIVE_INFINITY;
      }
    };

    apply();
    query.addEventListener('change', apply);

    return () => query.removeEventListener('change', apply);
  });

  $effect(() => {
    if (!playing) return;

    const timer = setInterval(() => {
      if (shown >= total) {
        playing = false;

        return;
      }
      shown += 1;
    }, STEP_MILLISECONDS);

    return () => clearInterval(timer);
  });

  // Keep the newest cell in view while it plays.
  $effect(() => {
    void shown;
    if (playing && scroller) scroller.scrollLeft = scroller.scrollWidth;
  });

  const play = (): void => {
    if (finished) shown = 0;
    playing = true;
  };

  const step = (): void => {
    playing = false;
    shown = Math.min(total, shown + 1);
  };

  const restart = (): void => {
    playing = false;
    stopTouchedBefore = null;
    ignoredTouch = false;
    shown = reducedMotion ? Number.POSITIVE_INFINITY : 0;
  };

  const touchStop = (): void => {
    const next = Math.min(shown, total) + 1;

    if (!config.governors.stopFile) {
      ignoredTouch = true;

      return;
    }

    stopTouchedBefore = next;
    ignoredTouch = false;
  };

  const linePoints = $derived(
    [
      `0,${LINE_HEIGHT - 4}`,
      ...visible.map(
        (record, index) =>
          `${(index + 1) * CELL},${(LINE_HEIGHT - 4 - (record.cumulative / maximumCost) * (LINE_HEIGHT - 12)).toFixed(1)}`,
      ),
    ].join(' '),
  );

  const status = $derived.by(() => {
    if (total === 0 && run.stoppedBy === 'stopFile') {
      return 'The stop file was touched before the first iteration, so nothing ran.';
    }
    if (!finished)
      return `Iteration ${Math.min(shown, total)} of this run, ${formatCost(visible.at(-1)?.cumulative ?? 0)} spent so far.`;

    const outcome =
      run.outcome === 'stopped' && run.stoppedBy
        ? `stopped by the ${stopReasonLabels[run.stoppedBy].toLowerCase()}`
        : outcomeStyles[run.outcome].label.toLowerCase();

    return `This run ended ${outcome} after ${run.iterations.toLocaleString('en-US')} ${run.iterations === 1 ? 'iteration' : 'iterations'}, costing ${formatCost(run.cost)}${run.prematureClaims > 0 ? `, with ${run.prematureClaims} premature ${run.prematureClaims === 1 ? 'claim' : 'claims'} caught` : ''}.`;
  });

  const activeRecord = $derived(active === null ? null : (visible[active] ?? null));
  const tooltipLeft = $derived(
    active === null
      ? 0
      : placeTooltip(
          (active + 0.5) * CELL - (scroller?.scrollLeft ?? 0),
          Math.min(TOOLTIP_WIDTH, viewportWidth - 8),
          viewportWidth,
        ),
  );

  const cellAt = (event: PointerEvent): number | null => {
    if (!scroller) return null;

    const bounds = scroller.getBoundingClientRect();
    const index = Math.floor((event.clientX - bounds.left + scroller.scrollLeft) / CELL);

    return index >= 0 && index < visible.length ? index : null;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (visible.length === 0) return;

    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
    };
    if (event.key in steps) {
      event.preventDefault();
      active = Math.min(visible.length - 1, Math.max(0, (active ?? -1) + steps[event.key]));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      active = event.key === 'Home' ? 0 : visible.length - 1;
    } else if (event.key === 'Escape') {
      active = null;
    }

    if (active !== null && scroller) {
      const left = active * CELL;
      if (left < scroller.scrollLeft) scroller.scrollLeft = left;
      if (left + CELL > scroller.scrollLeft + scroller.clientWidth) {
        scroller.scrollLeft = left + CELL - scroller.clientWidth;
      }
    }
  };

  const describe = (index: number): string => {
    const record = visible[index];
    if (!record) return '';

    return `Iteration ${record.iteration}: ${eventStyles[record.event].label}${record.governor ? `, then the ${stopReasonLabels[record.governor].toLowerCase()} fired` : ''}. ${formatCost(record.cumulative)} spent.`;
  };
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-2">
    {#if playing}
      <Button variant="secondary" size="small" icon={Pause} onclick={() => (playing = false)}
        >Pause</Button
      >
    {:else}
      <Button
        variant="secondary"
        size="small"
        icon={Play}
        disabled={!ready || reducedMotion}
        onclick={play}>{finished && total > 0 ? 'Replay' : 'Play'}</Button
      >
    {/if}
    <Button
      variant="secondary"
      size="small"
      icon={SkipForward}
      disabled={!ready || finished}
      onclick={step}>Step</Button
    >
    <Button
      variant="destructive"
      size="small"
      icon={Hand}
      disabled={!ready || finished}
      onclick={touchStop}>Touch STOP</Button
    >
    <Button variant="ghost" size="small" icon={RotateCcw} disabled={!ready} onclick={restart}
      >Start over</Button
    >
  </div>

  <p class="text-slate-700 dark:text-slate-200" aria-live="polite" data-testid="timeline-status">
    {status}
  </p>
  {#if ignoredTouch}
    <p role="note" class="text-sm text-amber-800 dark:text-amber-200" data-testid="stop-ignored">
      You touched the stop file, but nothing in this loop checks it, so the run keeps going. Turn on
      the stop file governor and try again.
    </p>
  {/if}
  {#if reducedMotion}
    <p class={bodyClasses}>
      Your system asks for reduced motion, so the whole run is drawn at once.
    </p>
  {/if}

  <div class="relative" bind:clientWidth={viewportWidth}>
    <div
      bind:this={scroller}
      role="slider"
      tabindex="0"
      aria-label="The sample run, one cell per iteration, with the running cost drawn above. Arrow keys move between iterations."
      aria-valuemin={1}
      aria-valuemax={Math.max(1, visible.length)}
      aria-valuenow={(active ?? 0) + 1}
      aria-valuetext={active === null ? status : describe(active)}
      data-testid="timeline"
      class="focus-visible:outline-primary-600 relative overflow-x-auto rounded-md pb-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      onkeydown={handleKeydown}
      onpointermove={(event) => (active = cellAt(event))}
      onpointerleave={() => (active = null)}
      onfocus={() => (active ??= visible.length > 0 ? visible.length - 1 : null)}
      onblur={() => (active = null)}
      onscroll={() => (active = null)}
    >
      <div style:width="{Math.max(visible.length, 1) * CELL}px" class="min-w-full">
        <svg
          width={Math.max(visible.length, 1) * CELL}
          height={LINE_HEIGHT}
          aria-hidden="true"
          class="block"
        >
          <polyline
            points={linePoints}
            fill="none"
            stroke-width="2"
            stroke-linejoin="round"
            class="stroke-rose-600 dark:stroke-rose-400"
          />
        </svg>
        <ol class="flex" aria-hidden="true">
          {#each visible as record, index (record.iteration)}
            <li
              data-event={record.event}
              data-governor={record.governor ?? undefined}
              style:width="{CELL}px"
              class="flex h-7 flex-none items-center justify-center border border-white text-xs font-bold dark:border-slate-900 {eventStyles[
                record.event
              ].cell} {record.governor
                ? 'ring-2 ring-sky-600 ring-inset dark:ring-sky-400'
                : ''} {active === index ? 'outline-2 outline-slate-900 dark:outline-white' : ''}"
            >
              {eventStyles[record.event].symbol}
            </li>
          {/each}
        </ol>
      </div>
    </div>
    {#if activeRecord && active !== null}
      <div
        role="tooltip"
        data-testid="timeline-tooltip"
        class="pointer-events-none absolute top-1 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        style:left="{tooltipLeft}px"
        style:width="{Math.min(TOOLTIP_WIDTH, viewportWidth - 8)}px"
      >
        {describe(active)}
      </div>
    {/if}
  </div>
  {#if total > MAXIMUM_CELLS && shown > MAXIMUM_CELLS}
    <p class={bodyClasses}>
      The timeline draws the first {MAXIMUM_CELLS} iterations. This run had {(
        total - MAXIMUM_CELLS
      ).toLocaleString('en-US')}
      more.
    </p>
  {/if}

  <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700 dark:text-slate-200">
    {#each Object.values(eventStyles) as style (style.label)}
      <li class="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          class="inline-flex size-5 items-center justify-center rounded-sm text-xs font-bold {style.cell}"
          >{style.symbol}</span
        >{style.label}
      </li>
    {/each}
    <li class="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        class="inline-block size-5 rounded-sm ring-2 ring-sky-600 ring-inset dark:ring-sky-400"
      ></span>A governor fired
    </li>
    <li class="flex items-center gap-1.5">
      <span aria-hidden="true" class="inline-block h-0.5 w-5 bg-rose-600 dark:bg-rose-400"
      ></span>Running cost
    </li>
  </ul>
</div>
