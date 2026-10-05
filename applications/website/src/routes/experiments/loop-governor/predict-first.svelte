<script lang="ts">
  import { Eye } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import { focusAfterUpdate } from '$lib/experiments/focus-after-update';

  import { bodyClasses, headingClasses, panelClasses } from './field-styles';
  import { formatShare } from './labels';

  type Props = {
    ready: boolean;
    /** The guess, from 0 to 100. */
    guess: number;
    /** Null until revealed. */
    answer: { exact: number; simulated: number; runs: number } | null;
    onGuess: (guess: number) => void;
    onReveal: () => void;
  };

  const { ready, guess, answer, onGuess, onReveal }: Props = $props();

  const verdict = $derived.by(() => {
    if (!answer) return '';

    const gap = guess - answer.exact * 100;
    if (Math.abs(gap) <= 5) return 'That’s close. Most people guess lower.';

    return gap < 0
      ? 'You guessed low, like most people. Every iteration that doesn’t finish is another chance to claim done, and nothing checks the claim.'
      : 'You guessed high. It’s bad, but not that bad: real progress usually wins the race.';
  });

  /** Reveals the answer and moves focus to it, since the button that had focus goes away. */
  const reveal = (): void => {
    onReveal();
    void focusAfterUpdate('prediction-outcome');
  };
</script>

<section aria-labelledby="predict-heading" class="{panelClasses} max-w-3xl">
  <div class="space-y-1">
    <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
    <p class="text-slate-700 dark:text-slate-200">
      With a promise-string marker and a 35% chance of real progress per iteration, what share of
      runs will end with a <em>false</em> “done”?
    </p>
  </div>

  <div class="space-y-2">
    <label for="prediction" class="block text-sm font-semibold text-slate-700 dark:text-slate-200">
      Your guess: <span class="tabular-nums">{guess}%</span>
    </label>
    <input
      id="prediction"
      type="range"
      min="0"
      max="100"
      step="1"
      value={guess}
      disabled={!ready || answer !== null}
      aria-valuetext="{guess}%"
      oninput={(event) => onGuess(Number(event.currentTarget.value))}
      class="accent-primary-600 w-full cursor-pointer disabled:cursor-not-allowed"
    />
  </div>

  <div
    id="prediction-outcome"
    role="group"
    aria-label="Your guess and the answer"
    tabindex="-1"
    aria-live="polite"
    class="outline-none"
  >
    {#if answer}
      <div class="grid gap-3 sm:grid-cols-2" data-testid="prediction-result">
        <div class="rounded-md bg-slate-100 p-3 dark:bg-slate-800">
          <p class={bodyClasses}>Your guess</p>
          <p class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white">{guess}%</p>
        </div>
        <div class="rounded-md bg-rose-50 p-3 dark:bg-rose-950/50">
          <p class={bodyClasses}>Runs that ended falsely done</p>
          <p class="text-2xl font-bold text-rose-700 tabular-nums dark:text-rose-300">
            {formatShare(answer.simulated)}
          </p>
          <p class={bodyClasses}>
            of {answer.runs.toLocaleString('en-US')} simulated runs. Exactly, it’s {formatShare(
              answer.exact,
            )}.
          </p>
        </div>
        <p class="text-slate-700 sm:col-span-2 dark:text-slate-200">{verdict}</p>
      </div>
    {:else}
      <Button variant="primary" icon={Eye} disabled={!ready} onclick={reveal}>
        Lock in my guess and show the answer
      </Button>
    {/if}
  </div>
</section>
