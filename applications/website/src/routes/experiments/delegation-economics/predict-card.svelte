<script lang="ts">
  import Button from '$lib/components/button';

  import { formatMinutes } from './display';
  import { fieldClasses, labelClasses } from './field-styles';
  import { parseGuess } from './prediction';
  import type { PredictionResult } from './prediction';

  type Props = {
    /** The scenario in plain words. */
    description: string;
    integrationMinutes: number;
    workers: number;
    /** Whether the page can respond yet. Before then, a click would be lost. */
    ready: boolean;
    revealed: boolean;
    /** The comparison once the answer is revealed, or null when the person skipped the guess. */
    result: PredictionResult | null;
    /** The scenario as it was when the answer was revealed. */
    revealedDescription: string | null;
    onReveal: (guess: number) => void;
    onSkip: () => void;
    onReset: () => void;
  };

  const {
    description,
    integrationMinutes,
    workers,
    ready,
    revealed,
    result,
    revealedDescription,
    onReveal,
    onSkip,
    onReset,
  }: Props = $props();

  let text = $state('');
  let attempted = $state(false);

  const guess = $derived(parseGuess(text));
  const invalid = $derived(attempted && guess === null);

  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    attempted = true;
    if (guess !== null) {
      onReveal(guess);
      text = '';
      attempted = false;
    }
  };
</script>

<section
  aria-labelledby="predict-heading"
  class="border-primary-300 dark:border-primary-700 space-y-4 rounded-lg border bg-white p-4 sm:p-6 dark:bg-slate-900"
  data-testid="predict-card"
>
  <h2 id="predict-heading" class="text-xl font-bold text-slate-900 dark:text-white">
    {revealed ? 'Your prediction' : 'Predict first'}
  </h2>

  {#if !revealed}
    <p class="text-lg text-slate-800 dark:text-slate-100" data-testid="scenario-words">
      {description}
    </p>
    {#if workers > 1}
      <p class="text-slate-600 dark:text-slate-300">
        Reading and reconciling each worker’s report takes {formatMinutes(integrationMinutes)}. How
        much faster does it finish than one session doing all of it?
      </p>
    {:else}
      <p class="text-slate-600 dark:text-slate-300">
        How much faster does it finish than one session doing all of it?
      </p>
    {/if}

    <form class="flex flex-wrap items-end gap-3" onsubmit={submit} novalidate>
      <div class="space-y-1.5">
        <label for="speedup-guess" class={labelClasses}>Your guess for the speedup</label>
        <input
          id="speedup-guess"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          spellcheck="false"
          placeholder="such as 2×"
          bind:value={text}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'speedup-guess-error' : undefined}
          class="{fieldClasses} w-36"
        />
      </div>
      <Button type="submit" disabled={!ready}>Reveal the answer</Button>
      <button
        type="button"
        disabled={!ready}
        onclick={onSkip}
        class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer py-2 text-sm underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Just show me
      </button>
    </form>
    {#if invalid}
      <p id="speedup-guess-error" class="text-sm text-red-700 dark:text-red-400">
        Enter a speedup such as 2 or 1.5×.
      </p>
    {/if}
  {:else}
    {#if revealedDescription}
      <p class="text-slate-600 dark:text-slate-300">{revealedDescription}</p>
    {/if}
    {#if result}
      <p
        class="text-lg font-semibold text-slate-900 dark:text-white"
        data-testid="prediction-result"
      >
        {result.sentence}
      </p>
    {:else}
      <p class="text-slate-700 dark:text-slate-200" data-testid="prediction-result">
        You skipped the guess. The results are below.
      </p>
    {/if}
    <button
      type="button"
      onclick={onReset}
      class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer text-sm underline underline-offset-2 focus-visible:outline-2"
    >
      Predict again
    </button>
  {/if}
</section>
