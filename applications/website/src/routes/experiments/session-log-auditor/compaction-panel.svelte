<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import type { AuditCompaction } from './audit-data';
  import { compactionRatio, formatPercent } from './compactions';
  import type { CompactionSummary } from './compactions';
  import { toCsv } from './digest';
  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    headCellClasses,
    tableClasses,
    tableRegionClasses,
    wrapAnywhere,
  } from './field-styles';

  type Props = { compactions: AuditCompaction[]; summary: CompactionSummary };

  const { compactions, summary }: Props = $props();

  const exportCsv = (): void =>
    downloadText(
      'compactions.csv',
      toCsv(
        ['Time', 'Session', 'Trigger', 'Tokens before', 'Tokens after', 'After as share of before'],
        compactions.map((event) => [
          event.timestamp,
          event.sessionId,
          event.trigger,
          event.preTokens,
          event.postTokens,
          formatPercent(compactionRatio(event)),
        ]),
      ),
      'text/csv',
    );
</script>

{#if compactions.length === 0}
  <p class={bodyClasses}>No compactions in these sessions.</p>
{:else}
  <div class="space-y-3">
    <p class="text-slate-800 dark:text-slate-100" data-testid="compaction-median">
      Median size after compacting: <strong>{formatPercent(summary.medianRatio)}</strong> of what
      was there before, across {formatTokenCount(compactions.length)} compaction{compactions.length ===
      1
        ? ''
        : 's'}
      ({formatTokenCount(summary.manual)} manual, {formatTokenCount(summary.auto)} auto).
    </p>
    <button type="button" class={buttonClasses} onclick={exportCsv}>Download as CSV</button>
    <div
      class="{tableRegionClasses} max-h-96"
      role="region"
      aria-label="Compactions table"
      tabindex="-1"
    >
      <table class={tableClasses} data-testid="compactions-table">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Time (UTC)</th>
            <th scope="col" class={headCellClasses}>Trigger</th>
            <th scope="col" class="{headCellClasses} text-right">Before</th>
            <th scope="col" class="{headCellClasses} text-right">After</th>
            <th scope="col" class="{headCellClasses} text-right">After ÷ before</th>
            <th scope="col" class={headCellClasses}>Session</th>
          </tr>
        </thead>
        <tbody>
          {#each compactions as event, index (`${event.file}:${index}`)}
            <tr>
              <th scope="row" class="{cellClasses} font-normal whitespace-nowrap">
                {event.timestamp ? event.timestamp.slice(0, 16).replace('T', ' ') : '—'}
              </th>
              <td class={cellClasses}>{event.trigger}</td>
              <td class="{cellClasses} text-right">{formatTokenCount(event.preTokens)}</td>
              <td class="{cellClasses} text-right">{formatTokenCount(event.postTokens)}</td>
              <td class="{cellClasses} text-right font-semibold"
                >{formatPercent(compactionRatio(event))}</td
              >
              <td class="{cellClasses} max-w-48 font-mono text-xs whitespace-normal">
                <span class={wrapAnywhere}>{event.sessionId}</span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
