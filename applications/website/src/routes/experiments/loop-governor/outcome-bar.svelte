<script lang="ts">
  import { formatCount, formatShare, outcomeStyles, stopReasonLabels } from './labels';
  import { outcomeIds } from './simulate';
  import type { StopReason, Tally } from './simulate';

  type Props = {
    tally: Tally;
    /** Names the bar when two are compared, such as "A (pinned)". */
    title?: string;
    id: string;
  };

  const { tally, title, id }: Props = $props();

  const rows = $derived(
    outcomeIds.map((outcome) => ({
      id: outcome,
      style: outcomeStyles[outcome],
      count: tally.outcomes[outcome],
      share: tally.runs > 0 ? tally.outcomes[outcome] / tally.runs : 0,
    })),
  );

  const stops = $derived(
    (Object.entries(tally.stoppedBy) as [StopReason, number][]).filter(([, count]) => count > 0),
  );

  const description = $derived(
    `${title ? `${title}: ` : ''}${rows
      .filter((row) => row.count > 0)
      .map((row) => `${row.style.label} ${formatShare(row.share)}`)
      .join(', ')}.`,
  );
</script>

<div class="min-w-0 space-y-3" data-testid="outcomes-{id}">
  {#if title}<h3 class="font-bold text-slate-900 dark:text-white">{title}</h3>{/if}
  <div
    role="img"
    aria-label={description}
    class="flex h-10 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
  >
    {#each rows as row (row.id)}
      {#if row.count > 0}
        <div
          class="h-full {row.style
            .fill} border-r-2 border-white last:border-r-0 dark:border-slate-900"
          style:width="{row.share * 100}%"
          data-outcome={row.id}
        ></div>
      {/if}
    {/each}
  </div>
  <div class="relative overflow-x-auto">
    <table class="w-full text-sm">
      <caption class="sr-only">{title ?? 'Outcomes'}, by count and share of runs</caption>
      <thead>
        <tr class="text-left text-slate-500 dark:text-slate-400">
          <th scope="col" class="py-1 pr-3 font-medium">Outcome</th>
          <th scope="col" class="py-1 pr-3 text-right font-medium">Runs</th>
          <th scope="col" class="py-1 text-right font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr
            class="border-t border-slate-100 dark:border-slate-800 {row.count === 0
              ? 'text-slate-400 dark:text-slate-500'
              : 'text-slate-800 dark:text-slate-100'}"
            data-outcome-row={row.id}
          >
            <th scope="row" class="py-1 pr-3 text-left font-normal">
              <span class="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="inline-block size-3 flex-none rounded-sm {row.style.fill}"
                ></span>
                {row.style.label}
              </span>
            </th>
            <td class="py-1 pr-3 text-right tabular-nums">{formatCount(row.count)}</td>
            <td class="py-1 text-right font-semibold tabular-nums">{formatShare(row.share)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if stops.length > 0}
    <p class="text-sm text-slate-600 dark:text-slate-300">
      Stopped by: {stops
        .map(([reason, count]) => `${stopReasonLabels[reason].toLowerCase()} ${formatCount(count)}`)
        .join(', ')}.
    </p>
  {/if}
</div>
