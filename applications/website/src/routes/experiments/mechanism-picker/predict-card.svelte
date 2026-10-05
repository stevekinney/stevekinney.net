<script lang="ts">
  import Button from '$lib/components/button';

  import InlineCode from './inline-code.svelte';
  import { findMechanism, mechanisms } from './mechanisms';
  import type { MechanismId } from './mechanisms';
  import OutlineBadge from './outline-badge.svelte';
  import { grade, missReason, predictScenario } from './scenarios';

  type Props = {
    pick: MechanismId | null;
    revealed: boolean;
    ready: boolean;
    onPick: (id: MechanismId) => void;
    onReveal: () => void;
    onReset: () => void;
  };

  const { pick, revealed, ready, onPick, onReveal, onReset }: Props = $props();

  const answer = findMechanism(predictScenario.answer);
  const result = $derived(pick ? grade(predictScenario, pick) : null);
  const reason = $derived(pick ? missReason(predictScenario, pick) : null);
</script>

<div class="space-y-4" data-testid="predict-card">
  <blockquote
    class="rounded-lg border-l-4 border-slate-400 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 dark:border-slate-500 dark:bg-slate-800/60 dark:text-white"
  >
    “{predictScenario.text}”
  </blockquote>

  <fieldset class="space-y-2" disabled={!ready || revealed}>
    <legend class="text-sm font-semibold text-slate-700 dark:text-slate-200">
      Where does it belong? Pick one before you see the answer.
    </legend>
    <div class="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {#each mechanisms as mechanism (mechanism.id)}
        <label
          class="has-checked:border-primary-600 has-checked:bg-primary-50 dark:has-checked:border-primary-400 dark:has-checked:bg-primary-900/40 flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 has-disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-100"
        >
          <input
            type="radio"
            name="predict"
            value={mechanism.id}
            checked={pick === mechanism.id}
            onchange={() => onPick(mechanism.id)}
            class="accent-primary-600"
          />
          {mechanism.name}
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="flex flex-wrap gap-3">
    {#if revealed}
      <Button variant="secondary" size="small" onclick={onReset}>Try it again</Button>
    {:else}
      <Button size="small" disabled={!ready || pick === null} onclick={onReveal}>
        Check my answer
      </Button>
    {/if}
  </div>

  <div aria-live="polite">
    {#if revealed && pick && result}
      <div
        data-testid="predict-feedback"
        data-grade={result}
        class="space-y-2 rounded-lg border p-4 {result === 'match'
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30'}"
      >
        <p class="font-bold text-slate-900 dark:text-white">
          {#if result === 'match'}
            Right: {answer.name}.
          {:else}
            Not quite. You picked {findMechanism(pick).name}. The answer is {answer.name}.
          {/if}
          <OutlineBadge />
        </p>
        {#if reason}
          <p class="text-slate-800 dark:text-slate-100" data-testid="predict-reason">{reason}</p>
        {/if}
        <p class="text-slate-700 dark:text-slate-200">
          <InlineCode text={predictScenario.reasoning} />
          {#if predictScenario.answerDetail}
            Use {predictScenario.answerDetail.toLowerCase()}.
          {/if}
        </p>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Most people pick a hook. A rule in an instructions file can only ask, and a hook only
          refuses on the machine it runs on.
        </p>
      </div>
    {/if}
  </div>
</div>
