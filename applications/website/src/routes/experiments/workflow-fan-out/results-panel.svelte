<script lang="ts">
  import type { ResultsHandling } from './config';
  import { bodyClasses, codeClasses } from './field-styles';
  import { describeFailure, summarizeResults } from './results';
  import type { StrategyRun } from './run';
  import type { ItemResult } from './schedule';
  import ToggleGroup from './toggle-group.svelte';

  type Props = {
    run: StrategyRun;
    stageNames: string[];
    handling: ResultsHandling;
    onHandlingChange: (handling: ResultsHandling) => void;
  };

  const { run, stageNames, handling, onHandlingChange }: Props = $props();

  /** The array view stops here; the counts above it always cover every item. */
  const MAXIMUM_SHOWN = 120;

  const results = $derived(run.schedule.results);
  const kept = $derived(results ? summarizeResults(results, 'keep') : null);
  const filtered = $derived(results ? summarizeResults(results, 'filter') : null);
  const chosen = $derived(handling === 'filter' ? filtered : kept);

  const label = (result: ItemResult): string =>
    result.value === 'value' ? `#${result.item + 1}` : 'null';
</script>

<div class="space-y-4">
  <ToggleGroup
    id="results-handling"
    label="Results handling"
    value={handling}
    options={[
      { value: 'keep', label: 'Keep nulls' },
      { value: 'filter', label: '.filter(Boolean)' },
    ]}
    onChange={(value) => onHandlingChange(value as ResultsHandling)}
  />

  {#if run.schedule.failure}
    {@const failure = run.schedule.failure}
    <p
      role="status"
      data-testid="results-headline"
      class="rounded-lg border-l-4 border-red-600 bg-red-50 px-4 py-3 font-semibold text-red-900 dark:border-red-400 dark:bg-red-950/40 dark:text-red-100"
    >
      {describeFailure(failure, stageNames[failure.stage])}
    </p>
    <p class={bodyClasses}>
      This is a bare <code class={codeClasses}>agent()</code> call or a
      <code class={codeClasses}>Promise.all</code>, so the schema error propagates: agents still
      running are abandoned, queued ones never start, and nothing after the failing line runs.
      Inside
      <code class={codeClasses}>pipeline()</code> or <code class={codeClasses}>parallel()</code>,
      the runtime catches the same error and the slot becomes <code class={codeClasses}>null</code>.
    </p>
  {:else if chosen && kept && filtered}
    <p
      role="status"
      data-testid="results-headline"
      class="rounded-lg border-l-4 px-4 py-3 text-lg font-bold {chosen.nulls > 0
        ? 'border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-300 dark:bg-amber-950/40 dark:text-amber-50'
        : 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-50'}"
    >
      {chosen.headline}
    </p>
    {#if handling === 'filter' && chosen.nulls > 0}
      <p class={bodyClasses} data-testid="results-reported">
        What the run itself says: <strong>{chosen.reported}</strong>. Nothing in it mentions the
        {chosen.nulls} items that are gone.
      </p>
    {/if}

    <div class="grid gap-4 md:grid-cols-2">
      {#each [kept, filtered] as summary, index (index)}
        <figure
          class="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <figcaption class="text-sm font-semibold text-slate-900 dark:text-white">
            {index === 0 ? 'Nulls kept' : 'After .filter(Boolean)'}:
            <span data-testid="results-length-{index === 0 ? 'keep' : 'filter'}"
              >length {summary.length}</span
            >
          </figcaption>
          <ol
            class="flex flex-wrap gap-1 font-mono text-xs"
            aria-label={index === 0 ? 'Results with nulls kept' : 'Results after filter'}
          >
            {#each summary.received.slice(0, MAXIMUM_SHOWN) as result (result.item)}
              <li
                class="rounded px-1.5 py-0.5 {result.value === 'null'
                  ? 'bg-red-100 font-bold text-red-800 dark:bg-red-950/60 dark:text-red-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}"
              >
                {label(result)}
              </li>
            {/each}
            {#if summary.received.length > MAXIMUM_SHOWN}
              <li class="px-1.5 py-0.5 text-slate-500 dark:text-slate-400">
                …{summary.received.length - MAXIMUM_SHOWN} more
              </li>
            {/if}
          </ol>
        </figure>
      {/each}
    </div>

    {#if run.schedule.logged.length > 0}
      <div class="space-y-1">
        <p class="text-sm font-semibold text-slate-900 dark:text-white">
          Logged by the runtime ({run.schedule.logged.length})
        </p>
        <ul
          class="max-h-40 space-y-0.5 overflow-y-auto font-mono text-xs [overflow-wrap:anywhere] text-slate-700 dark:text-slate-200"
        >
          {#each run.schedule.logged.slice(0, MAXIMUM_SHOWN) as line, index (index)}
            <li>{line}</li>
          {/each}
        </ul>
        <p class={bodyClasses}>
          A schema error throws from <code class={codeClasses}>agent()</code>. Inside
          <code class={codeClasses}>pipeline()</code> and
          <code class={codeClasses}>parallel()</code>
          the runtime catches it, logs it, and leaves <code class={codeClasses}>null</code> in that slot,
          so the stage call itself still resolves.
        </p>
      </div>
    {/if}
  {/if}
</div>
