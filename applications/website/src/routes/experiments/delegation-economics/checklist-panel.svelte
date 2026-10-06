<script lang="ts">
  import { CircleCheck, TriangleAlert } from '@lucide/svelte';

  import { checklistItems, isChecked } from './checklist';
  import type { Checks, ManualChecklistId, Verdict } from './checklist';
  import { formatMinutes } from './display';
  import type { Evaluation } from './economics';
  import { hintClasses } from './field-styles';

  type Props = {
    checks: Checks;
    evaluation: Evaluation;
    verdict: Verdict;
    onToggle: (id: ManualChecklistId, checked: boolean) => void;
  };

  const { checks, evaluation, verdict, onToggle }: Props = $props();
</script>

<div class="space-y-4">
  <p class="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
    The signal for delegating is ten or more files to explore, or three or more independent pieces
    of work. If you already know which file it is, do it yourself. Check anything that’s true of
    your task. The list is the course outline’s.
  </p>

  <ul class="space-y-2">
    {#each checklistItems as item (item.id)}
      <li>
        {#if item.id === 'integration'}
          <label class="flex items-start gap-2 text-slate-800 dark:text-slate-100">
            <input
              type="checkbox"
              checked={isChecked(item.id, checks, evaluation)}
              disabled
              aria-describedby="integration-computed"
              class="accent-primary-600 mt-1 size-4 flex-none"
            />
            <span>
              {item.label}
              <span id="integration-computed" class="block {hintClasses}">
                Checked for you when the fan-out takes as long as solo or longer: {formatMinutes(
                  evaluation.fanMinutes,
                )} against {formatMinutes(evaluation.soloMinutes)} now.
              </span>
            </span>
          </label>
        {:else}
          {@const id = item.id as ManualChecklistId}
          <label class="flex items-start gap-2 text-slate-800 dark:text-slate-100">
            <input
              type="checkbox"
              checked={checks[id]}
              onchange={(event) => onToggle(id, event.currentTarget.checked)}
              class="accent-primary-600 mt-1 size-4 flex-none"
            />
            <span>{item.label}</span>
          </label>
        {/if}
      </li>
    {/each}
  </ul>

  <div
    class="flex items-start gap-3 rounded-lg border p-4 {verdict.blocked
      ? 'border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
      : 'border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40'}"
    data-testid="verdict"
    aria-live="polite"
  >
    {#if verdict.blocked}
      <TriangleAlert
        aria-hidden="true"
        class="mt-0.5 size-5 flex-none text-amber-700 dark:text-amber-400"
      />
    {:else}
      <CircleCheck
        aria-hidden="true"
        class="mt-0.5 size-5 flex-none text-emerald-700 dark:text-emerald-400"
      />
    {/if}
    <div class="space-y-1">
      <p class="font-semibold text-slate-900 dark:text-white">{verdict.headline}</p>
      {#each verdict.reasons.slice(1) as reason (reason)}
        <p class="text-sm text-slate-700 dark:text-slate-200">{reason}</p>
      {/each}
    </div>
  </div>
</div>
