<script lang="ts">
  import type { Analysis } from './analysis';
  import { formatNumber, formatPercent } from './display';
  import { bodyClasses, headingClasses } from './field-styles';
  import { describeVerdict } from './verdict';

  export type Prediction = 'yes' | 'no' | 'cant-tell';

  type Props = {
    /** The analysis of the five-tasks preset, which the question is about. */
    analysis: Analysis;
    prediction: Prediction | null;
    ready: boolean;
    onPredict: (prediction: Prediction) => void;
    onTryPaired: () => void;
  };

  const { analysis, prediction, ready, onPredict, onTryPaired }: Props = $props();

  const choices: { value: Prediction; label: string }[] = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'cant-tell', label: 'Can’t tell' },
  ];

  const comparison = $derived(analysis.comparison?.kind === 'mean' ? analysis.comparison : null);
  const verdict = $derived(describeVerdict(analysis));
  const answer = $derived<Prediction>(
    analysis.verdict?.kind === 'distinguishable'
      ? comparison && comparison.test.difference > 0
        ? 'yes'
        : 'no'
      : 'cant-tell',
  );
  const spread = $derived.by(() => {
    if (!comparison) return null;
    const all = [...comparison.valuesA, ...comparison.valuesB];

    return { low: Math.min(...all), high: Math.max(...all) };
  });

  const labelOf = (value: Prediction): string =>
    choices.find((choice) => choice.value === value)?.label ?? value;
</script>

<section aria-labelledby="predict-heading" class="space-y-4" data-testid="predict">
  <div class="space-y-1">
    <h2 id="predict-heading" class={headingClasses}>Predict first</h2>
    <p class="max-w-3xl {bodyClasses}">
      Five tasks under workflow A and five different tasks under workflow B. The averages:
    </p>
  </div>

  {#if comparison}
    <dl class="flex flex-wrap gap-4">
      <div class="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
        <dt class="text-sm text-slate-600 dark:text-slate-300">A, mean minutes per task</dt>
        <dd
          class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white"
          data-testid="predict-mean-a"
        >
          {formatNumber(comparison.test.meanA, 1)}
        </dd>
      </div>
      <div class="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700">
        <dt class="text-sm text-slate-600 dark:text-slate-300">B, mean minutes per task</dt>
        <dd
          class="text-3xl font-bold text-slate-900 tabular-nums dark:text-white"
          data-testid="predict-mean-b"
        >
          {formatNumber(comparison.test.meanB, 1)}
        </dd>
      </div>
    </dl>
  {/if}

  <div class="flex flex-col gap-4 md:flex-row md:items-start">
    <fieldset class="space-y-2">
      <legend class="text-lg font-semibold text-slate-900 dark:text-white"
        >Is B really faster?</legend
      >
      <div class="flex flex-wrap gap-2">
        {#each choices as choice (choice.value)}
          <button
            type="button"
            disabled={!ready}
            aria-pressed={prediction === choice.value}
            onclick={() => onPredict(choice.value)}
            class="focus-visible:outline-primary-600 aria-pressed:bg-primary-700 dark:aria-pressed:bg-primary-300 min-w-24 cursor-pointer rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-transparent aria-pressed:text-white dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 dark:aria-pressed:text-slate-900"
          >
            {choice.label}
          </button>
        {/each}
      </div>
    </fieldset>

    <div aria-live="polite" class="min-w-0 flex-1">
      {#if prediction && verdict}
        <div
          class="space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800"
          data-testid="predict-answer"
        >
          <p class="text-slate-900 dark:text-white">
            You said <strong>{labelOf(prediction)}</strong>. The answer is
            <strong>{labelOf(answer)}</strong>{prediction === answer ? ', so you called it.' : '.'}
          </p>
          <p class="text-slate-700 dark:text-slate-200">
            {verdict.body}
            {#if comparison && spread}
              B’s mean is {formatPercent(comparison.percent)} lower, but these tasks run from {spread.low}
              to {spread.high} minutes, and with so few of them that spread swamps the gap.
            {/if}
          </p>
          <p class="text-slate-700 dark:text-slate-200">
            Five tasks aren’t hopeless, though. Run the same five both ways and see what happens.
          </p>
          <button
            type="button"
            onclick={onTryPaired}
            class="focus-visible:outline-primary-600 text-primary-700 dark:text-primary-300 cursor-pointer font-semibold underline underline-offset-2 focus-visible:outline-2"
          >
            Try the same five tasks, paired
          </button>
        </div>
      {/if}
    </div>
  </div>
</section>
