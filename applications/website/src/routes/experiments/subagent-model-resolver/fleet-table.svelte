<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';

  import type { FleetAnalysis, FleetFilter, FleetRow } from './fleet';
  import { rowMatchesFilter } from './fleet';
  import ModelSwatch from './model-swatch.svelte';

  type Props = {
    analysis: FleetAnalysis;
    filter: FleetFilter;
    ready: boolean;
    onSelect: (row: FleetRow) => void;
  };

  const { analysis, filter, ready, onSelect }: Props = $props();

  const rows = $derived(analysis.rows.filter((row) => rowMatchesFilter(row, filter)));

  const pillClasses = {
    'more-expensive': 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
    cheaper: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
    unknown: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
  } as const;

  const cell = 'px-3 py-2 align-top';
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="focus-visible:outline-primary-600 relative max-h-[28rem] overflow-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
  tabindex="0"
  role="region"
  aria-label="Fleet table"
>
  <table class="w-full min-w-[56rem] border-collapse text-sm">
    <caption class="sr-only">
      Every agent, where it comes from, what it declares, and the model it resolves to in each of
      the two compared versions. Changed rows come first.
    </caption>
    <thead class="sticky top-0 z-10 bg-white dark:bg-slate-900">
      <tr
        class="border-b border-slate-300 text-left text-slate-600 dark:border-slate-600 dark:text-slate-300"
      >
        <th scope="col" class="px-3 py-2 font-semibold">Agent</th>
        <th scope="col" class="px-3 py-2 font-semibold">Scope</th>
        <th scope="col" class="px-3 py-2 font-semibold">Declares</th>
        <th scope="col" class="px-3 py-2 font-semibold">{analysis.columns.beforeLabel}</th>
        <th scope="col" class="px-3 py-2 font-semibold">{analysis.columns.afterLabel}</th>
        <th scope="col" class="px-3 py-2 font-semibold">Change</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr
          data-agent={row.name}
          data-status={row.status.kind}
          class="relative border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 {row
            .status.kind === 'shadowed'
            ? 'text-slate-500 dark:text-slate-400'
            : ''}"
        >
          <th scope="row" class="{cell} text-left font-normal">
            <button
              type="button"
              disabled={!ready || row.status.kind === 'shadowed'}
              onclick={() => onSelect(row)}
              class="focus-visible:outline-primary-600 cursor-pointer text-left font-semibold break-all text-slate-900 underline-offset-4 before:absolute before:inset-0 hover:underline focus-visible:outline-2 disabled:cursor-default disabled:no-underline dark:text-white"
              aria-label={row.status.kind === 'shadowed'
                ? row.name
                : `Show ${row.name} in the resolver`}
            >
              {row.name}
            </button>
            <span class="mt-1 flex flex-wrap gap-1">
              {#if row.overridesBuiltIn}
                <span
                  class="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-900/50 dark:text-sky-100"
                >
                  Overrides the built-in
                </span>
              {/if}
              {#if row.status.kind === 'ambiguous'}
                <span
                  class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                >
                  Ambiguous duplicate
                </span>
              {/if}
              {#if row.status.kind === 'shadowed'}
                <span
                  class="rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                >
                  Shadowed
                </span>
              {/if}
            </span>
            {#if row.status.kind !== 'effective'}
              <span class="mt-1 block max-w-xs text-xs font-normal">
                {row.status.kind === 'shadowed' && row.shadowedBy
                  ? `Shadowed by the ${row.shadowedBy.scope} definition ${row.shadowedBy.path}. ${row.status.reason}`
                  : row.status.reason}
              </span>
            {/if}
            {#if row.definition && row.definition.warnings.length > 0}
              <span
                class="mt-1 block max-w-xs text-xs font-normal text-amber-800 dark:text-amber-300"
              >
                {row.definition.warnings.join(' ')}
              </span>
            {/if}
          </th>
          <td class={cell}>{row.scopeLabel}</td>
          <td class="{cell} font-mono">{row.declares}</td>
          <td class={cell}>
            {#if row.before === null}
              <span aria-hidden="true">—</span><span class="sr-only">Doesn’t run</span>
            {:else}
              <ModelSwatch model={row.before} />
            {/if}
          </td>
          <td class={cell}>
            {#if row.after === null}
              <span aria-hidden="true">—</span><span class="sr-only">Doesn’t run</span>
            {:else}
              <ModelSwatch model={row.after} />
            {/if}
          </td>
          <td class={cell}>
            {#if row.changed && row.direction && row.before !== null && row.after !== null}
              <span
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-semibold whitespace-nowrap {pillClasses[
                  row.direction
                ]}"
              >
                {row.before === 'unrecognized' ? 'unrecognized' : row.before}
                <ArrowRight aria-label="to" class="size-3" />
                {row.after === 'unrecognized' ? 'unrecognized' : row.after}
              </span>
            {:else if row.status.kind === 'shadowed'}
              <span class="text-xs">shadowed</span>
            {:else}
              <span class="text-xs text-slate-500 dark:text-slate-400">unchanged</span>
            {/if}
          </td>
        </tr>
      {:else}
        <tr>
          <td colspan="6" class="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
            No agents match this filter.
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
