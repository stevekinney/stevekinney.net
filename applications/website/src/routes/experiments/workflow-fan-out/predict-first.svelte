<script lang="ts">
  import { drawAgents } from './agents';
  import { bodyClasses, fieldClasses, labelClasses } from './field-styles';
  import { revealPrediction } from './predict';
  import type { Reveal, Winner } from './predict';
  import { findPreset, slowFirstSlowLastGrid } from './presets';
  import { simulate } from './schedule';

  type Props = {
    ready: boolean;
    onLoadPreset: (id: string) => void;
  };

  const { ready, onLoadPreset }: Props = $props();

  const preset = findPreset('slow-first-slow-last')!.config();
  const grid = drawAgents(preset);
  const makespan = (strategy: 'pipeline' | 'parallel'): number =>
    simulate(grid, {
      strategy,
      concurrency: preset.concurrency,
      errorHandling: 'caught',
      validationAttempts: 5,
    }).makespan;

  let winner = $state<Winner | null>(null);
  let minutesText = $state('');
  let reveal = $state<Reveal | null>(null);

  const choices: { value: Winner; label: string }[] = [
    { value: 'pipeline', label: 'pipeline() finishes first' },
    { value: 'parallel', label: 'parallel() finishes first' },
    { value: 'tie', label: 'They tie' },
  ];

  const minutes = $derived(
    /^\d+(\.\d+)?$/.test(minutesText.trim()) ? Number(minutesText.trim()) : null,
  );
</script>

<div class="space-y-4">
  <p class={bodyClasses}>
    Four items go through two stages, at a concurrency of 16, so every agent can start the moment
    it’s ready. Each cell is how many minutes that item’s agent takes.
  </p>
  <div class="relative overflow-x-auto">
    <table
      class="text-sm text-slate-700 tabular-nums dark:text-slate-200"
      data-testid="predict-grid"
    >
      <caption class="sr-only">Minutes per item and stage for the prediction</caption>
      <thead>
        <tr>
          <th scope="col" class="px-3 py-1 text-left">Item</th>
          <th scope="col" class="px-3 py-1 text-right">Stage 1</th>
          <th scope="col" class="px-3 py-1 text-right">Stage 2</th>
        </tr>
      </thead>
      <tbody>
        {#each slowFirstSlowLastGrid as row, item (item)}
          <tr class="border-t border-slate-100 dark:border-slate-800">
            <th scope="row" class="px-3 py-1 text-left font-normal">{item + 1}</th>
            <td class="px-3 py-1 text-right">{row[0]}</td>
            <td class="px-3 py-1 text-right">{row[1]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <form
    class="space-y-4"
    onsubmit={(event) => {
      event.preventDefault();
      if (!winner) return;
      reveal = revealPrediction({ winner, minutes }, makespan('pipeline'), makespan('parallel'));
    }}
  >
    <fieldset class="space-y-2">
      <legend class={labelClasses}>Which finishes first, and by how much?</legend>
      <div class="flex flex-wrap gap-x-5 gap-y-2">
        {#each choices as choice (choice.value)}
          <label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="radio"
              name="winner"
              value={choice.value}
              disabled={!ready}
              checked={winner === choice.value}
              onchange={() => (winner = choice.value)}
              class="size-4"
            />
            {choice.label}
          </label>
        {/each}
      </div>
    </fieldset>
    <div class="max-w-48 space-y-1.5">
      <label for="predict-minutes" class={labelClasses}>By how many minutes</label>
      <input
        id="predict-minutes"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        disabled={!ready || winner === 'tie'}
        bind:value={minutesText}
        class={fieldClasses}
      />
    </div>
    <button
      type="submit"
      disabled={!ready || winner === null}
      class="bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-600 dark:bg-primary-500 min-h-10 cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Reveal
    </button>
  </form>

  <div aria-live="polite">
    {#if reveal}
      <div
        data-testid="predict-reveal"
        class="space-y-2 rounded-lg border-l-4 px-4 py-3 {reveal.correctWinner
          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-50'
          : 'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50'}"
      >
        <p class="font-semibold">{reveal.message}</p>
        <p class="text-sm">
          Each item takes 11 minutes at most, so pipeline() ends at 11. parallel() waits for item
          4’s 10 minutes in stage 1 and then item 1’s 10 minutes in stage 2.
        </p>
        <button
          type="button"
          onclick={() => onLoadPreset('slow-first-slow-last')}
          class="text-sm font-semibold underline underline-offset-2"
        >
          Load it into the charts
        </button>
      </div>
    {/if}
  </div>
</div>
