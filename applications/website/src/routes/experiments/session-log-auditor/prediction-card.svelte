<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import type { Overview } from './analysis';
  import { formatPercent } from './compactions';
  import { bodyClasses, buttonClasses, headingClasses, linkButtonClasses } from './field-styles';

  type Props = {
    guess: number;
    revealed: boolean;
    overview: Overview;
    onGuess: (guess: number) => void;
    onReveal: () => void;
  };

  const { guess, revealed, overview, onGuess, onReveal }: Props = $props();

  const measured = $derived(overview.floorShare === null ? null : overview.floorShare * 100);
  const gap = $derived(measured === null ? null : Math.round(measured - guess));
</script>

<section
  aria-labelledby="predict-heading"
  class="space-y-4 rounded-lg border-2 border-amber-300 bg-amber-50/60 p-4 sm:p-6 dark:border-amber-700 dark:bg-amber-950/30"
>
  <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
  <label for="floor-guess" class="block max-w-2xl text-slate-800 dark:text-slate-100">
    What share of your failed tool calls do you think are environmental: missing commands, shell
    options, wrong flags?
  </label>
  <div class="flex max-w-xl items-center gap-4">
    <input
      id="floor-guess"
      type="range"
      min="0"
      max="100"
      step="1"
      value={guess}
      disabled={revealed}
      aria-valuetext="{guess}%"
      oninput={(event) => onGuess(Number(event.currentTarget.value))}
      class="accent-primary-600 h-2 min-w-0 flex-1 cursor-pointer disabled:cursor-default"
    />
    <output
      for="floor-guess"
      class="w-14 text-right text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
      data-testid="guess-value"
    >
      {guess}%
    </output>
  </div>

  {#if !revealed}
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class={buttonClasses} onclick={onReveal}
        >Reveal the measured share</button
      >
      <button type="button" class={linkButtonClasses} onclick={onReveal}>Skip the guess</button>
    </div>
    <p class={bodyClasses}>The breakdown appears once you’ve guessed.</p>
  {:else}
    <div aria-live="polite" class="space-y-3" data-testid="prediction-result">
      {#if measured === null}
        <p class="text-slate-800 dark:text-slate-100">
          These sessions have no failed tool calls, so there’s no share to measure.
        </p>
      {:else}
        <div class="grid max-w-xl gap-2 text-sm">
          {#each [{ name: 'Your guess', value: guess, bar: 'bg-slate-500 dark:bg-slate-400' }, { name: 'Measured', value: measured, bar: 'bg-amber-500 dark:bg-amber-400' }] as row (row.name)}
            <div class="grid grid-cols-[6rem_1fr_3.5rem] items-center gap-2">
              <span class="text-slate-700 dark:text-slate-200">{row.name}</span>
              <span class="h-3 rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                <span class="block h-3 rounded-full {row.bar}" style:width="{row.value}%"></span>
              </span>
              <span class="text-right font-semibold text-slate-900 tabular-nums dark:text-white">
                {row.name === 'Measured' ? formatPercent(overview.floorShare) : `${row.value}%`}
              </span>
            </div>
          {/each}
        </div>
        <p class="max-w-2xl text-slate-800 dark:text-slate-100">
          {formatTokenCount(overview.floorFailures)} of {formatTokenCount(overview.failures)} failed tool
          calls came from the floor: the environment the agent stood on, not the model.
          {#if gap !== null && Math.abs(gap) >= 1}
            That’s {Math.abs(gap)} points {gap > 0 ? 'more' : 'less'} than you guessed.
          {:else}
            That’s right where you guessed.
          {/if}
          {#if overview.askFailures > 0}
            Another {formatTokenCount(overview.askFailures)} could be either; the examples tell you which.
          {/if}
        </p>
      {/if}
    </div>
  {/if}
</section>
