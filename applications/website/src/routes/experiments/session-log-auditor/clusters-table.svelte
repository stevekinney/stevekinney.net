<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';

  import { formatTokenCount } from '$lib/experiments/format';

  import { categoryStyle } from './category-styles';
  import type { Cluster } from './clusters';
  import { isCalendarDate, QUIET_DAYS, upsertMark } from './control-rows';
  import type { ControlRow, FixMark } from './control-rows';
  import { toCsv } from './digest';
  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    codeClasses,
    fieldClasses,
    headCellClasses,
    labelClasses,
    linkButtonClasses,
    tableClasses,
    tableRegionClasses,
    wrapAnywhere,
  } from './field-styles';
  import { floorExplainers } from './floor-explainers';
  import { dayOf } from './timeline';

  type Props = {
    clusters: Cluster[];
    categories: string[];
    marks: FixMark[];
    controlRows: ControlRow[];
    returns: Record<string, string>;
    lastDay: string | null;
    onMarks: (marks: FixMark[]) => void;
  };

  const { clusters, categories, marks, controlRows, returns, lastDay, onMarks }: Props = $props();

  const PAGE = 25;

  let expanded = $state<Record<string, true>>({});
  let showAll = $state(false);
  let drafts = $state<Record<string, string>>({});

  const visible = $derived(showAll ? clusters : clusters.slice(0, PAGE));
  const marksByKey = $derived(new Map(marks.map((mark) => [mark.key, mark])));
  const rowsByKey = $derived(new Map(controlRows.map((row) => [row.mark.key, row])));

  const toggle = (key: string): void => {
    if (expanded[key]) delete expanded[key];
    else expanded[key] = true;
  };

  const regressionDay = (cluster: Cluster): string | null =>
    rowsByKey.get(cluster.key)?.firstReturn ?? returns[cluster.key] ?? null;

  const saveMark = (cluster: Cluster): void => {
    const date = drafts[cluster.key] ?? '';
    if (!isCalendarDate(date)) return;

    onMarks(
      upsertMark(marks, {
        key: cluster.key,
        tool: cluster.tool,
        signature: cluster.signature,
        date,
      }),
    );
  };

  const exportCsv = (): void =>
    downloadText(
      'session-clusters.csv',
      toCsv(
        [
          'Signature',
          'Tool',
          'Category',
          'Sessions affected',
          'Occurrences',
          'First seen',
          'Last seen',
          'Exit codes',
        ],
        clusters.map((cluster) => [
          cluster.signature,
          cluster.tool,
          cluster.category,
          cluster.sessions,
          cluster.occurrences,
          dayOf(cluster.firstSeen),
          dayOf(cluster.lastSeen),
          cluster.exitCodes.join(' '),
        ]),
      ),
      'text/csv',
    );
</script>

{#if clusters.length === 0}
  <p class={bodyClasses}>No failed tool calls match these filters.</p>
{:else}
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class={bodyClasses}>
        {formatTokenCount(clusters.length)} cluster{clusters.length === 1 ? '' : 's'}, ranked by
        sessions affected, then occurrences. Open a row for its verbatim examples.
      </p>
      <button type="button" class={buttonClasses} onclick={exportCsv}>Download as CSV</button>
    </div>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class={tableRegionClasses} role="region" aria-label="Top clusters table" tabindex="0">
      <table class={tableClasses} data-testid="clusters-table">
        <thead>
          <tr>
            <th scope="col" class="{headCellClasses} min-w-64">Signature</th>
            <th scope="col" class={headCellClasses}>Tool</th>
            <th scope="col" class={headCellClasses}>Category</th>
            <th scope="col" class="{headCellClasses} text-right">Sessions affected</th>
            <th scope="col" class="{headCellClasses} text-right">Occurrences</th>
            <th scope="col" class={headCellClasses}>First seen</th>
            <th scope="col" class={headCellClasses}>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {#each visible as cluster, index (cluster.key)}
            {@const style = categoryStyle(cluster.category, categories)}
            {@const back = regressionDay(cluster)}
            <tr data-testid="cluster-row">
              <th
                scope="row"
                class="{cellClasses} max-w-md text-left font-normal whitespace-normal"
              >
                <button
                  type="button"
                  aria-expanded={Boolean(expanded[cluster.key])}
                  aria-controls="cluster-details-{index}"
                  onclick={() => toggle(cluster.key)}
                  class="focus-visible:outline-primary-600 flex cursor-pointer items-start gap-1 text-left focus-visible:outline-2"
                >
                  <ChevronRight
                    aria-hidden="true"
                    class="mt-0.5 size-4 flex-none transition-transform motion-reduce:transition-none {expanded[
                      cluster.key
                    ]
                      ? 'rotate-90'
                      : ''}"
                  />
                  <code class="font-mono text-xs {wrapAnywhere}">{cluster.signature}</code>
                </button>
                {#if back}
                  <span
                    class="mt-1 ml-5 inline-block rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-200"
                  >
                    Regression: back on {back}
                  </span>
                  <span class="mt-0.5 ml-5 block text-xs text-slate-500 dark:text-slate-400">
                    {rowsByKey.get(cluster.key)?.firstReturn
                      ? 'After the date you marked it fixed.'
                      : `After ${QUIET_DAYS} or more active days without it.`}
                  </span>
                {/if}
              </th>
              <td class={cellClasses}><span class={wrapAnywhere}>{cluster.tool}</span></td>
              <td class={cellClasses}>
                <span class="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    aria-hidden="true"
                    class="inline-block size-2.5 flex-none rounded-sm {style.swatch}"
                  ></span>
                  {cluster.category}
                </span>
              </td>
              <td class="{cellClasses} text-right font-semibold"
                >{formatTokenCount(cluster.sessions)}</td
              >
              <td class="{cellClasses} text-right">{formatTokenCount(cluster.occurrences)}</td>
              <td class="{cellClasses} whitespace-nowrap">{dayOf(cluster.firstSeen) ?? '—'}</td>
              <td class="{cellClasses} whitespace-nowrap">{dayOf(cluster.lastSeen) ?? '—'}</td>
            </tr>
            {#if expanded[cluster.key]}
              {@const mark = marksByKey.get(cluster.key)}
              {@const explainer = floorExplainers[cluster.category]}
              <tr id="cluster-details-{index}">
                <td
                  colspan="7"
                  class="{cellClasses} bg-slate-50/60 whitespace-normal dark:bg-slate-900/60"
                >
                  <div
                    class="max-w-[min(48rem,calc(100vw-4rem))] space-y-4"
                    data-testid="cluster-details"
                  >
                    <div class="space-y-2">
                      <h4 class="font-semibold text-slate-900 dark:text-white">
                        Verbatim examples
                      </h4>
                      {#if cluster.examples.length === 0}
                        <p class={bodyClasses}>None of these failures could be quoted exactly.</p>
                      {:else}
                        <ul class="space-y-2">
                          {#each cluster.examples as example (`${example.file}:${example.line}`)}
                            <li class="space-y-0.5">
                              <code
                                class="block {codeClasses} {wrapAnywhere} whitespace-pre-wrap"
                                data-testid="example-quote">{example.quote}</code
                              >
                              <span
                                class="block text-xs text-slate-500 dark:text-slate-400 {wrapAnywhere}"
                              >
                                {example.file}:{example.line}{example.timestamp
                                  ? `, ${example.timestamp.slice(0, 16).replace('T', ' ')} UTC`
                                  : ''}
                              </span>
                            </li>
                          {/each}
                        </ul>
                      {/if}
                      {#if cluster.unquotable > 0}
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                          {formatTokenCount(cluster.unquotable)} failure{cluster.unquotable === 1
                            ? ''
                            : 's'}
                          couldn’t be found word for word in their line, so they aren’t quoted.
                        </p>
                      {/if}
                      {#if cluster.command}
                        <p class="text-sm text-slate-700 dark:text-slate-200">
                          First command: <code class="{codeClasses} {wrapAnywhere}"
                            >{cluster.command}</code
                          >
                        </p>
                      {/if}
                      {#if cluster.exitCodes.length > 0}
                        <p class="text-sm text-slate-700 dark:text-slate-200">
                          Exit code{cluster.exitCodes.length === 1 ? '' : 's'}: {cluster.exitCodes.join(
                            ', ',
                          )}
                        </p>
                      {/if}
                    </div>

                    {#if explainer}
                      <details class="rounded-md border border-amber-300 p-3 dark:border-amber-700">
                        <summary
                          class="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          Why might this be the floor?
                        </summary>
                        <div class="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                          <p class="font-semibold">{explainer.title}</p>
                          <ul class="list-disc space-y-1 pl-5">
                            {#each explainer.examples as line (line)}<li>{line}</li>{/each}
                          </ul>
                          <p><strong>Fix pattern:</strong> {explainer.fix}</p>
                        </div>
                      </details>
                    {/if}

                    <div class="space-y-2">
                      <h4 class="font-semibold text-slate-900 dark:text-white">Control row</h4>
                      {#if mark}
                        <p class="text-sm text-slate-700 dark:text-slate-200">
                          Marked fixed on {mark.date}.
                          <button
                            type="button"
                            class={linkButtonClasses}
                            onclick={() => onMarks(marks.filter((entry) => entry.key !== mark.key))}
                          >
                            Remove the mark
                          </button>
                        </p>
                      {/if}
                      <div class="flex flex-wrap items-end gap-2">
                        <div class="space-y-1">
                          <label for="fix-date-{index}" class={labelClasses}>
                            Mark fixed on…
                          </label>
                          <input
                            id="fix-date-{index}"
                            type="date"
                            value={drafts[cluster.key] ?? mark?.date ?? lastDay ?? ''}
                            onchange={(event) => (drafts[cluster.key] = event.currentTarget.value)}
                            class={fieldClasses}
                          />
                        </div>
                        <button
                          type="button"
                          class={buttonClasses}
                          onclick={() => {
                            drafts[cluster.key] ??= mark?.date ?? lastDay ?? '';
                            saveMark(cluster);
                          }}
                        >
                          {mark ? 'Move the fix date' : 'Mark fixed'}
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
    {#if clusters.length > PAGE}
      <button type="button" class={linkButtonClasses} onclick={() => (showAll = !showAll)}>
        {showAll ? `Show the top ${PAGE}` : `Show all ${formatTokenCount(clusters.length)}`}
      </button>
    {/if}
  </div>
{/if}
