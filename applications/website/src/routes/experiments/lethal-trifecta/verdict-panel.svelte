<script lang="ts">
  import type { Evaluation } from './evaluate';
  import { describeVerdict } from './verdict';

  type Props = { evaluation: Evaluation; revealed: boolean };

  const { evaluation, revealed }: Props = $props();

  const text = $derived(describeVerdict(evaluation));

  const tints = {
    exploitable:
      'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100',
    safe: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
    unusual:
      'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100',
  } as const;
</script>

<div role="status" aria-live="polite" class="space-y-4">
  {#if revealed}
    <div
      data-testid="verdict"
      data-verdict={text.tone}
      class="space-y-2 rounded-lg border p-4 text-lg leading-relaxed {tints[text.tone]}"
    >
      <p><strong class="font-bold">{text.headline}</strong>: {text.detail}</p>
      {#if text.legLine}
        <p data-testid="leg-line" class="font-semibold">{text.legLine}</p>
      {/if}
      {#if evaluation.path}
        <p data-testid="path" class="font-semibold [overflow-wrap:anywhere]">
          {evaluation.path.sentence}
        </p>
        {#if evaluation.path.exit.note}
          <p class="text-base">{evaluation.path.exit.note}</p>
        {/if}
      {/if}
    </div>

    <div class="space-y-2" data-testid="residual-risks">
      <h3 class="font-bold text-slate-900 dark:text-white">Residual risks</h3>
      {#if evaluation.residualRisks.length === 0}
        <p class="text-sm text-slate-600 dark:text-slate-300">
          None: no path is held only by a human gate or a partial control.
        </p>
      {:else}
        <ul class="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          {#each evaluation.residualRisks as risk, index (index)}
            <li class="flex gap-2 [overflow-wrap:anywhere]" data-risk={risk.kind}>
              <span
                class="h-fit flex-none rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                >{risk.kind === 'human-gate' ? 'human gate' : 'partial'}</span
              >
              <span class="min-w-0">{risk.text}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <p
      class="rounded-lg border border-dashed border-slate-300 p-4 text-slate-600 dark:border-slate-600 dark:text-slate-300"
    >
      Make your prediction above to see the verdict.
    </p>
  {/if}
</div>
