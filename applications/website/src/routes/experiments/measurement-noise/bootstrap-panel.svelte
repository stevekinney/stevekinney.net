<script lang="ts">
  import { RefreshCw } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { MAX_SEED } from './bootstrap';
  import type { BootstrapInterval } from './bootstrap';
  import { formatCount, formatInterval, intervalDecimals } from './display';
  import { bodyClasses, fieldClasses, labelClasses } from './field-styles';

  export type BootstrapView = {
    status: 'idle' | 'running' | 'done' | 'not-applicable';
    completed: number;
    total: number;
    result: BootstrapInterval | null;
    /** The last interval from a different seed on the same data, to compare against. */
    previous: BootstrapInterval | null;
    /** Why it doesn't apply, such as a yes-or-no endpoint. */
    reason: string | null;
  };

  type Props = {
    view: BootstrapView;
    seed: number;
    unit: string;
    ready: boolean;
    onSeed: (seed: number) => void;
  };

  const { view, seed, unit, ready, onSeed }: Props = $props();

  let seedText = $state('');
  let editing = $state(false);

  $effect(() => {
    const next = String(seed);
    if (!editing) seedText = next;
  });

  const parseSeed = (text: string): number | null =>
    /^\d+$/.test(text.trim()) && Number(text) <= MAX_SEED ? Number(text) : null;

  const invalid = $derived(parseSeed(seedText) === null);

  const show = (interval: BootstrapInterval): string =>
    formatInterval(
      interval.lower,
      interval.upper,
      intervalDecimals(interval.lower, interval.upper),
    );
</script>

<div class="space-y-4">
  <p class="max-w-3xl {bodyClasses}">
    A second opinion that assumes nothing about the shape of the data: resample the tasks with
    replacement 10,000 times, take the difference in medians each time, and keep the middle 95%. The
    randomness comes from a seeded generator, so the same seed always gives the same interval.
  </p>

  {#if view.status === 'not-applicable'}
    <p class={bodyClasses} data-testid="bootstrap-result">{view.reason}</p>
  {:else}
    <div class="flex flex-wrap items-end gap-3">
      <div class="space-y-1.5">
        <label for="bootstrap-seed" class={labelClasses}>Seed</label>
        <input
          id="bootstrap-seed"
          type="text"
          inputmode="numeric"
          disabled={!ready}
          value={seedText}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'bootstrap-seed-error' : undefined}
          onfocus={() => (editing = true)}
          onblur={() => {
            editing = false;
            if (invalid) seedText = String(seed);
          }}
          oninput={(event) => {
            seedText = event.currentTarget.value;
            const parsed = parseSeed(seedText);
            if (parsed !== null && parsed !== seed) onSeed(parsed);
          }}
          class="{fieldClasses} w-36"
        />
      </div>
      <Button
        variant="secondary"
        icon={RefreshCw}
        disabled={!ready}
        onclick={() => onSeed((Math.imul(seed, 1_103_515_245) + 12_345) >>> 0)}
      >
        Try another seed
      </Button>
    </div>
    {#if invalid}
      <p id="bootstrap-seed-error" class="text-sm text-red-700 dark:text-red-400">
        A seed is a whole number from 0 to {formatCount(MAX_SEED)}.
      </p>
    {/if}

    <div aria-live="polite" class="space-y-2" data-testid="bootstrap-result">
      {#if view.status === 'running'}
        <p class="text-slate-700 dark:text-slate-200">
          Resampling… {formatCount(view.completed)} of {formatCount(view.total)}
        </p>
        <progress
          max={view.total}
          value={view.completed}
          aria-label="Bootstrap progress"
          class="accent-primary-600 h-2 w-full max-w-md"
        ></progress>
      {:else if view.result}
        <p class="text-slate-900 dark:text-white">
          With seed <strong class="tabular-nums">{view.result.seed}</strong>, the 95% interval for
          the difference in medians is <strong class="tabular-nums">{show(view.result)}</strong>
          {unit}.
          {#if view.result.usable < view.result.resamples}
            ({formatCount(view.result.usable)} of {formatCount(view.result.resamples)} resamples could
            be used.)
          {/if}
        </p>
        {#if view.previous && view.previous.seed !== view.result.seed}
          <p class="text-slate-700 dark:text-slate-200" data-testid="bootstrap-compare">
            {#if view.previous.lower === view.result.lower && view.previous.upper === view.result.upper}
              Seed {view.previous.seed} gave the same interval, {show(view.previous)}. With this few
              distinct values, the percentiles land on the same data points whatever the seed.
            {:else}
              Seed {view.previous.seed} gave {show(view.previous)}. A different seed gives a
              slightly different interval: that wobble is resampling noise, not news about your
              workflow.
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</div>
