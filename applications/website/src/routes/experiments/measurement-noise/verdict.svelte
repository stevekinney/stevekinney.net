<script lang="ts">
  import type { Comparison } from './compare';
  import { describeComparison } from './compare';
  import { formatNumber, intervalDecimals } from './display';

  type Props = { comparison: Comparison; testId?: string };

  const { comparison, testId = 'verdict' }: Props = $props();

  const text = $derived(describeComparison(comparison));
  const decimals = $derived(intervalDecimals(comparison.test.lower, comparison.test.upper));

  // Each verdict carries a sign as well as a color, so it never depends on color alone.
  const styles = {
    distinguishable: {
      sign: '≠',
      tint: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
    },
    'cant-tell': {
      sign: '?',
      tint: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100',
    },
  } as const;
</script>

<div
  role="status"
  data-testid={testId}
  data-verdict={text.kind}
  class="flex gap-4 rounded-lg border p-4 {styles[text.kind].tint}"
>
  <span aria-hidden="true" class="text-3xl leading-none font-bold">{styles[text.kind].sign}</span>
  <div class="min-w-0 space-y-1 [overflow-wrap:anywhere]">
    <p class="text-lg leading-relaxed">
      <strong class="font-bold">{text.headline}</strong>
      {text.body}
    </p>
    <p class="text-sm tabular-nums" data-testid="{testId}-interval">
      A − B: {formatNumber(comparison.test.difference, decimals)} minutes, 95% interval [{formatNumber(
        comparison.test.lower,
        decimals,
      )}, {formatNumber(comparison.test.upper, decimals)}].
    </p>
    {#if text.plan}
      <p data-testid="{testId}-plan">{text.plan}</p>
    {/if}
  </div>
</div>
