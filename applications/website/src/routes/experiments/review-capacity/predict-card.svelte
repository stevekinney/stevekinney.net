<script lang="ts">
  import Button from '$lib/components/button';

  import { formatLines, formatNumber, plural } from './display';
  import { bodyClasses, fieldClasses, headingClasses, labelClasses } from './field-styles';
  import { dailyBalance } from './model';
  import type { Scenario } from './scenario';
  import { sustainableText } from './summary';

  type Props = {
    scenario: Scenario;
    guess: string;
    /** Null until revealed; whether the person skipped the guess. */
    revealed: { skipped: boolean } | null;
    ready: boolean;
    onGuess: (guess: string) => void;
    onReveal: (skipped: boolean) => void;
  };

  const { scenario, guess, revealed, ready, onGuess, onReveal }: Props = $props();

  const balance = $derived(dailyBalance(scenario));
  const perAgent = $derived(scenario.prsPerAgent * scenario.linesPerPr);
  const parsedGuess = $derived(/^\s*\d{1,3}\s*$/.test(guess) ? Number(guess) : null);

  const verdict = $derived.by(() => {
    const sustainable = balance.sustainableAgents;
    if (parsedGuess === null || sustainable === null) return null;
    if (parsedGuess === sustainable) return 'Right on. Most people guess higher.';
    if (parsedGuess > sustainable) {
      return `You guessed ${parsedGuess - sustainable} more than you can keep reviewed. That’s the misconception this page is about: agents multiply what’s generated, not what you review.`;
    }

    return 'You guessed lower than the arithmetic allows, which is the safe side to be wrong on.';
  });
</script>

<section
  aria-labelledby="predict-heading"
  class="border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30 max-w-3xl space-y-4 rounded-lg border p-4 sm:p-6"
>
  <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
  <p class="text-slate-800 dark:text-slate-100" data-testid="predict-question">
    With {scenario.agents}
    {plural(scenario.agents, 'agent')} each opening {formatNumber(scenario.prsPerAgent)}
    {plural(scenario.prsPerAgent, 'pull request')} of {formatLines(scenario.linesPerPr)} lines a day,
    how many agents can you keep fully reviewed?
  </p>
  <p class={bodyClasses}>
    You review well for {scenario.sittings}
    {plural(scenario.sittings, 'sitting')} a day, about {formatLines(scenario.linesPerSitting)} lines
    each.
  </p>

  {#if revealed === null}
    <form
      class="flex flex-wrap items-end gap-3"
      onsubmit={(event) => {
        event.preventDefault();
        if (parsedGuess !== null) onReveal(false);
      }}
    >
      <div class="space-y-1">
        <label for="prediction" class={labelClasses}>Your guess, in agents</label>
        <input
          id="prediction"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          value={guess}
          disabled={!ready}
          oninput={(event) => onGuess(event.currentTarget.value)}
          class="{fieldClasses} w-28"
        />
      </div>
      <Button type="submit" variant="primary" disabled={!ready || parsedGuess === null}>
        Reveal
      </Button>
      <button
        type="button"
        disabled={!ready}
        onclick={() => onReveal(true)}
        class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer py-2 text-sm underline underline-offset-2 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Skip the guess
      </button>
    </form>
    <p class={bodyClasses}>The rest of the page opens once you’ve guessed or skipped.</p>
  {:else}
    <dl
      class="grid grid-cols-2 gap-3 sm:max-w-md"
      data-testid="prediction-reveal"
      aria-live="polite"
    >
      <div
        class="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
      >
        <dt class="text-sm text-slate-600 dark:text-slate-300">Your guess</dt>
        <dd
          class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
          data-testid="guess-value"
        >
          {revealed.skipped || parsedGuess === null ? 'Skipped' : parsedGuess}
        </dd>
      </div>
      <div
        class="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
      >
        <dt class="text-sm text-slate-600 dark:text-slate-300">You can keep reviewed</dt>
        <dd
          class="text-2xl font-bold text-slate-900 tabular-nums dark:text-white"
          data-testid="sustainable-value"
        >
          {balance.sustainableAgents ?? 'Any'}
        </dd>
      </div>
    </dl>
    {#if !revealed.skipped && verdict}
      <p class="text-slate-800 dark:text-slate-100">{verdict}</p>
    {/if}
    <p class={bodyClasses}>
      {#if balance.sustainableAgents === null}
        Each agent opens nothing, so {sustainableText(null)} fits.
      {:else}
        You can review {formatLines(balance.capacity)} lines a day well. Each agent opens {formatLines(
          perAgent,
        )}, so {formatLines(balance.capacity)} ÷ {formatLines(perAgent)} rounds down to {sustainableText(
          balance.sustainableAgents,
        )}.
      {/if}
    </p>
  {/if}
</section>
