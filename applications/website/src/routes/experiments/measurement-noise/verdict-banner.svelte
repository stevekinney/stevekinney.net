<script lang="ts">
  import type { VerdictText } from './verdict';

  type Props = { verdict: VerdictText | null };

  const { verdict }: Props = $props();

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
    'not-measured': {
      sign: '∅',
      tint: 'border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100',
    },
  } as const;
</script>

{#if verdict}
  <div
    role="status"
    data-testid="verdict"
    data-verdict={verdict.kind}
    class="flex gap-4 rounded-lg border p-4 {styles[verdict.kind].tint}"
  >
    <span aria-hidden="true" class="text-3xl leading-none font-bold"
      >{styles[verdict.kind].sign}</span
    >
    <div class="min-w-0 space-y-1 [overflow-wrap:anywhere]">
      <p class="text-lg leading-relaxed">
        <strong class="font-bold">{verdict.headline}</strong>
        {verdict.body}
      </p>
      {#if verdict.detail}
        <p data-testid="verdict-detail">{verdict.detail}</p>
      {/if}
    </div>
  </div>
{:else}
  <div
    role="status"
    data-testid="no-verdict"
    class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-lg text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
  >
    <strong class="font-bold">No verdict.</strong> This data has no outcome in it, so there’s nothing
    to call a difference. See why above.
  </div>
{/if}
