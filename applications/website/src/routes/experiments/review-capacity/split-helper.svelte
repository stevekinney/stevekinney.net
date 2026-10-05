<script lang="ts">
  import { untrack } from 'svelte';

  import { formatLines, plural } from './display';
  import { bodyClasses, fieldClasses, labelClasses } from './field-styles';
  import { parseField } from './scenario';
  import { splitPlan } from './split';

  type Props = {
    /** Starts at the scenario's pull-request size. */
    initialLines: number;
    linesPerSitting: number;
    minutesPerSitting: number;
    ready: boolean;
  };

  const { initialLines, linesPerSitting, minutesPerSitting, ready }: Props = $props();

  let text = $state(untrack(() => String(initialLines)));
  const lines = $derived(parseField('linesPerPr', text));
  const plan = $derived(
    lines === null ? null : splitPlan(lines, linesPerSitting, minutesPerSitting),
  );
</script>

<div class="space-y-4">
  <div class="space-y-1">
    <label for="split-lines" class={labelClasses}>Pull request size, in changed lines</label>
    <input
      id="split-lines"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      disabled={!ready}
      bind:value={text}
      aria-invalid={lines === null || undefined}
      aria-describedby="split-result"
      class="{fieldClasses} w-32"
    />
  </div>
  <div id="split-result" aria-live="polite" data-testid="split-result" class="space-y-2">
    {#if plan === null}
      <p class="text-sm text-red-700 dark:text-red-400">Enter a whole number from 1 to 20,000.</p>
    {:else if plan.sittings <= 1}
      <p class="text-slate-800 dark:text-slate-100">
        {formatLines(plan.lines)} lines fit in one effective sitting of {formatLines(
          linesPerSitting,
        )}
        lines, about {minutesPerSitting} minutes. Review it as it is.
      </p>
    {:else}
      <p class="text-slate-800 dark:text-slate-100">
        {formatLines(plan.lines)} lines need <strong>{plan.sittings} effective sittings</strong>,
        about
        {plan.minutes} minutes of good review. Split it into {plan.sittings} reviewable
        {plural(plan.sittings, 'unit')} of
        {plan.parts.map(formatLines).join(', ')} lines.
      </p>
      <ol class="list-decimal space-y-1 pl-6 text-sm text-slate-700 dark:text-slate-200">
        {#each plan.parts as part, index (index)}
          <li>Unit {index + 1}: {formatLines(part)} lines, one sitting</li>
        {/each}
      </ol>
      <p class={bodyClasses}>
        Cut along the change, not the line count: a rename or move first, then the behavior change,
        then its tests. Each unit should be one thing you can state in a sentence, so the history
        you merge matches the changes you made.
      </p>
    {/if}
  </div>
</div>
