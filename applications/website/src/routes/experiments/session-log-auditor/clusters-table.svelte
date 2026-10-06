<script lang="ts">
  import { ChevronRight } from '@lucide/svelte';

  import { formatTokenCount } from '$lib/experiments/format';

  import { verdictOf } from './analysis';
  import type { Verdict } from './analysis';
  import { categoryStyle } from './category-styles';
  import type { Cluster } from './clusters';
  import {
    bodyClasses,
    cellClasses,
    codeClasses,
    headCellClasses,
    linkButtonClasses,
    tableClasses,
    tableRegionClasses,
    wrapAnywhere,
  } from './field-styles';
  import { floorExplainers } from './floor-explainers';
  import { dayOf } from './timeline';

  type Props = { clusters: Cluster[] };

  const { clusters }: Props = $props();

  const PAGE = 15;

  // Class names written out in full so Tailwind finds them.
  const badgeClasses: Record<Verdict, string> = {
    floor: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    'floor or task': 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
    harness: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200',
    task: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  };

  let expanded = $state<Record<string, true>>({});
  let showAll = $state(false);

  const visible = $derived(showAll ? clusters : clusters.slice(0, PAGE));

  const toggle = (key: string): void => {
    if (expanded[key]) delete expanded[key];
    else expanded[key] = true;
  };
</script>

{#if clusters.length === 0}
  <p class={bodyClasses}>No failed tool calls in these sessions.</p>
{:else}
  <div class="space-y-3">
    <p class={bodyClasses}>
      {formatTokenCount(clusters.length)} cluster{clusters.length === 1 ? '' : 's'}, ranked by
      sessions affected, then occurrences. Open a row for its verbatim examples and, for the floor,
      a fix.
    </p>

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class={tableRegionClasses} role="region" aria-label="Top clusters table" tabindex="0">
      <table class={tableClasses} data-testid="clusters-table">
        <thead>
          <tr>
            <th scope="col" class="{headCellClasses} min-w-64">Signature</th>
            <th scope="col" class={headCellClasses}>Whose problem</th>
            <th scope="col" class="{headCellClasses} text-right">Sessions affected</th>
            <th scope="col" class="{headCellClasses} text-right">Occurrences</th>
            <th scope="col" class={headCellClasses}>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {#each visible as cluster, index (cluster.key)}
            {@const style = categoryStyle(cluster.category)}
            {@const verdict = verdictOf(cluster.category)}
            {@const explainer = floorExplainers[cluster.category]}
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
                {#if explainer}
                  <span class="mt-1 ml-5 block text-xs text-slate-600 dark:text-slate-300">
                    {explainer.title}
                  </span>
                {/if}
              </th>
              <td class={cellClasses}>
                <span
                  class="inline-block rounded px-1.5 py-0.5 text-xs font-semibold {badgeClasses[
                    verdict
                  ]}"
                  data-testid="verdict-badge">{verdict}</span
                >
                <span class="mt-1 flex items-center gap-1.5 text-xs whitespace-nowrap">
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
              <td class="{cellClasses} whitespace-nowrap">{dayOf(cluster.lastSeen) ?? '—'}</td>
            </tr>
            {#if expanded[cluster.key]}
              <tr id="cluster-details-{index}">
                <td
                  colspan="5"
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
                      <p class="text-sm text-slate-700 dark:text-slate-200">
                        Tool: <span class={wrapAnywhere}>{cluster.tool}</span>
                      </p>
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
                      <div
                        class="rounded-md border border-amber-300 p-3 dark:border-amber-700"
                        data-testid="floor-explainer"
                      >
                        <h4 class="text-sm font-semibold text-slate-900 dark:text-white">
                          Why this might be the floor
                        </h4>
                        <div class="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                          <ul class="list-disc space-y-1 pl-5">
                            {#each explainer.examples as line (line)}<li>{line}</li>{/each}
                          </ul>
                          <p><strong>Fix pattern:</strong> {explainer.fix}</p>
                        </div>
                      </div>
                    {/if}
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
