<script lang="ts">
  import type { ChangeEvaluation } from './calculate';
  import { describeVerdict } from './verdict';

  type Props = { evaluation: ChangeEvaluation };

  const { evaluation }: Props = $props();

  const segments = $derived(describeVerdict(evaluation));

  const tints = {
    unchanged:
      'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    'worth-it':
      'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
    'not-yet':
      'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100',
    never:
      'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100',
  } as const;
</script>

<p
  role="status"
  data-verdict={evaluation.verdict}
  class="rounded-lg border p-4 text-lg leading-relaxed {tints[evaluation.verdict]}"
>
  {#each segments as segment, index (index)}{#if segment.strong}<strong
        class="font-bold tabular-nums">{segment.text}</strong
      >{:else}{segment.text}{/if}{/each}
</p>
