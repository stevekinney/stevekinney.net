<script lang="ts">
  import type { ChangeEvaluation } from './calculate';
  import { formatDollars } from './display';

  type Props = { evaluation: ChangeEvaluation };

  const { evaluation }: Props = $props();
</script>

{#if evaluation.cachePreserving}
  <aside
    aria-label="This change may be free"
    class="border-primary-300 bg-primary-50 text-primary-950 dark:border-primary-700 dark:bg-primary-950/40 dark:text-primary-100 rounded-lg border p-4"
  >
    <p class="font-semibold">This change may be free.</p>
    <p class="mt-1">
      {evaluation.to.name} can change effort without resetting its cache. Through a per-request effort
      setting at the API level, the re-cache cost ({formatDollars(evaluation.cost)}) drops to zero.
      That applies when you control the request, not when you flip effort inside an interactive
      coding session. The figures on this page still show the full re-cache cost.
    </p>
  </aside>
{/if}
