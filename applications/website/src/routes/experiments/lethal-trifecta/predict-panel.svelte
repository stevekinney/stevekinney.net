<script lang="ts">
  import { focusAfterUpdate } from '$lib/experiments/focus-after-update';

  type Props = {
    prediction: boolean | null;
    revealed: boolean;
    /** The careful team's real answer. */
    exploitable: boolean;
    ready: boolean;
    onPredict: (exploitable: boolean) => void;
    onSkip: () => void;
  };

  const { prediction, revealed, exploitable, ready, onPredict, onSkip }: Props = $props();

  // Answering disables the buttons and skipping removes its own, so focus follows the answer.
  const predict = (value: boolean): void => {
    onPredict(value);
    void focusAfterUpdate('prediction-outcome');
  };

  const skip = (): void => {
    onSkip();
    void focusAfterUpdate('prediction-outcome');
  };

  const options = [
    { value: true, label: 'Yes, still exploitable' },
    { value: false, label: 'No, it’s protected' },
  ];
</script>

<div class="space-y-4" data-testid="predict">
  <p class="max-w-3xl text-slate-700 dark:text-slate-200">
    This is the <strong>Careful team</strong>: a firm line in CLAUDE.md telling the agent to ignore
    instructions in untrusted content, auto mode on, and a deny rule for
    <code class="rounded bg-slate-100 px-1 font-mono text-[0.9em] dark:bg-slate-800"
      >Bash(curl *)</code
    >.
  </p>
  <p id="predict-question" class="text-lg font-semibold text-slate-900 dark:text-white">
    Is this agent still exploitable?
  </p>
  <div role="group" aria-labelledby="predict-question" class="flex flex-wrap gap-3">
    {#each options as option (option.label)}
      <button
        type="button"
        disabled={!ready || revealed}
        aria-pressed={prediction === option.value}
        onclick={() => predict(option.value)}
        class="focus-visible:outline-primary-600 aria-pressed:border-primary-600 aria-pressed:bg-primary-600 dark:aria-pressed:border-primary-400 dark:aria-pressed:bg-primary-700 min-h-10 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400 [&:disabled:not([aria-pressed=true])]:opacity-60"
      >
        {option.label}
      </button>
    {/each}
    {#if !revealed}
      <button
        type="button"
        disabled={!ready}
        onclick={skip}
        class="cursor-pointer text-sm text-slate-600 underline underline-offset-2 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:text-white"
      >
        Skip and show me
      </button>
    {/if}
  </div>
  <div
    id="prediction-outcome"
    role="group"
    aria-label="The answer"
    tabindex="-1"
    aria-live="polite"
    class="outline-none"
  >
    {#if revealed}
      <p
        data-testid="prediction-result"
        class="max-w-3xl rounded-lg border-l-4 px-4 py-3 {prediction === null
          ? 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200'
          : prediction === exploitable
            ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-rose-500 bg-rose-50 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100'}"
      >
        {#if prediction === null}
          You skipped the prediction. The answer: the careful team is
          <strong>{exploitable ? 'still exploitable' : 'not exploitable'}</strong>.
        {:else}
          You said <strong>{prediction ? 'yes' : 'no'}</strong>. The answer:
          <strong>{exploitable ? 'yes, still exploitable' : 'no'}</strong>.
          {prediction === exploitable ? 'Right.' : 'The plausible answer is the wrong one here.'}
        {/if}
        None of those three controls is a property of the OS, the network, or the architecture. Two rely
        on the model’s judgment, and the curl deny leaves every other HTTP client. The diagram below shows
        the path.
      </p>
    {/if}
  </div>
</div>
