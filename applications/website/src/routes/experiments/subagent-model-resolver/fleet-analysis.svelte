<script lang="ts">
  import { Download, TriangleAlert } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { downloadText } from './download';
  import { buildCsv, buildMarkdownReport } from './export-report';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import FixPanel from './fix-panel.svelte';
  import { configurationForRow } from './fleet';
  import type { FleetAnalysis, FleetFilter, FleetRow } from './fleet';
  import FleetTable from './fleet-table.svelte';
  import InlineCode from './inline-code.svelte';
  import type { ResolverConfiguration } from './resolve';
  import type { SetupState } from './setup-state';
  import { formatVersion } from './versions';
  import type { VersionRange } from './versions';

  type Props = {
    analysis: FleetAnalysis;
    setup: SetupState;
    controls: ResolverConfiguration;
    range: VersionRange;
    ready: boolean;
    onLoadConfiguration: (configuration: ResolverConfiguration) => void;
  };

  let {
    analysis,
    setup = $bindable(),
    controls,
    range,
    ready,
    onLoadConfiguration,
  }: Props = $props();

  let filter = $state<FleetFilter>('all');

  const filters = $derived<{ id: FleetFilter; label: string; count: number }[]>([
    { id: 'all', label: 'All', count: analysis.rows.length },
    {
      id: 'changed',
      label: 'Changed only',
      count: analysis.rows.filter((row) => row.changed).length,
    },
    { id: 'no-model', label: 'No model: line', count: analysis.noModelLineCount },
    { id: 'shadowed', label: 'Shadowed', count: analysis.shadowedCount },
  ]);

  const planner = $derived(setup.comparison.mode === 'planner' ? setup.comparison : null);

  const usePlanner = (): void => {
    setup.comparison = {
      mode: 'planner',
      from: formatVersion(analysis.context.version),
      to: formatVersion(range.last),
    };
  };

  const select = (row: FleetRow): void => {
    onLoadConfiguration(configurationForRow(row, analysis, controls));
  };

  const verdictClasses = $derived(
    analysis.verdict.id === 'nothing-can-flip' || analysis.verdict.id === 'no-changes'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
      : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100',
  );
</script>

<div class="space-y-6">
  <div
    role="status"
    data-testid="fleet-verdict"
    data-verdict={analysis.verdict.id}
    class="rounded-lg border px-4 py-3 text-lg font-semibold {verdictClasses}"
  >
    <InlineCode text={analysis.verdict.text} />
  </div>

  <details class="max-w-3xl" open>
    <summary
      class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
    >
      Assumptions ({analysis.assumptions.length})
    </summary>
    <ul
      data-testid="assumptions"
      class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300"
    >
      {#each analysis.assumptions as assumption, index (index)}
        <li><InlineCode text={assumption} /></li>
      {/each}
    </ul>
  </details>

  {#if analysis.warnings.length > 0}
    <ul
      data-testid="warnings"
      aria-label="Problems with your files"
      class="max-w-3xl space-y-1 text-sm text-amber-900 dark:text-amber-200"
    >
      {#each analysis.warnings as warning, index (index)}
        <li class="flex items-start gap-2">
          <TriangleAlert aria-hidden="true" class="mt-0.5 size-4 flex-none" />
          <span
            ><span class="font-semibold break-all">{warning.source}:</span>
            <InlineCode text={warning.message} /></span
          >
        </li>
      {/each}
    </ul>
  {/if}

  <div class="space-y-3">
    <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div
        role="group"
        aria-label="What to compare"
        class="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
      >
        <button
          type="button"
          disabled={!ready}
          aria-pressed={setup.comparison.mode === 'boundary'}
          onclick={() => (setup.comparison = { mode: 'boundary' })}
          class="focus-visible:outline-primary-600 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 focus-visible:outline-2 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
        >
          Around 2.1.251
        </button>
        <button
          type="button"
          disabled={!ready}
          aria-pressed={setup.comparison.mode === 'planner'}
          onclick={usePlanner}
          class="focus-visible:outline-primary-600 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 focus-visible:outline-2 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
        >
          Upgrade planner
        </button>
      </div>

      {#if planner}
        <div class="space-y-1.5">
          <label for="planner-from" class={labelClasses}>From version</label>
          <input
            id="planner-from"
            type="text"
            value={planner.from}
            oninput={(event) => {
              if (setup.comparison.mode === 'planner')
                setup.comparison.from = event.currentTarget.value;
            }}
            autocomplete="off"
            spellcheck="false"
            class="{fieldClasses} w-32 font-mono tabular-nums"
          />
        </div>
        <div class="space-y-1.5">
          <label for="planner-to" class={labelClasses}>To version</label>
          <input
            id="planner-to"
            type="text"
            value={planner.to}
            oninput={(event) => {
              if (setup.comparison.mode === 'planner')
                setup.comparison.to = event.currentTarget.value;
            }}
            autocomplete="off"
            spellcheck="false"
            class="{fieldClasses} w-32 font-mono tabular-nums"
          />
        </div>
      {/if}
    </div>
    <p class={hintClasses}>
      Comparing <span class="font-mono font-semibold">{analysis.columns.beforeLabel}</span> with
      <span class="font-mono font-semibold">{analysis.columns.afterLabel}</span>.
    </p>

    <p data-testid="fleet-summary" class="text-slate-700 dark:text-slate-200">
      <span class="font-semibold">{analysis.summary.movesUp}</span> move up a tier,
      <span class="font-semibold">{analysis.summary.movesDown}</span> move down a tier, and
      <span class="font-semibold">{analysis.summary.unchanged}</span> are unchanged.
      {#if analysis.summary.moved > analysis.summary.movesUp + analysis.summary.movesDown}
        The rest move to or from a model with no tier.
      {/if}
    </p>
  </div>

  <div class="space-y-3">
    <div role="group" aria-label="Filter the table" class="flex flex-wrap gap-2">
      {#each filters as entry (entry.id)}
        <button
          type="button"
          aria-pressed={filter === entry.id}
          onclick={() => (filter = entry.id)}
          class="focus-visible:outline-primary-600 aria-pressed:border-primary-600 aria-pressed:bg-primary-600 dark:aria-pressed:bg-primary-700 cursor-pointer rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:text-white dark:border-slate-600 dark:text-slate-200"
        >
          {entry.label} ({entry.count})
        </button>
      {/each}
    </div>
    <FleetTable {analysis} {filter} {ready} onSelect={select} />
  </div>

  <FixPanel {analysis} {ready} />

  <div class="flex flex-wrap items-center gap-3">
    <Button
      variant="secondary"
      size="small"
      icon={Download}
      disabled={!ready}
      onclick={() =>
        downloadText('subagent-model-audit.md', buildMarkdownReport(analysis), 'text/markdown')}
    >
      Download audit report (Markdown)
    </Button>
    <Button
      variant="secondary"
      size="small"
      icon={Download}
      disabled={!ready}
      onclick={() => downloadText('subagent-model-audit.csv', buildCsv(analysis), 'text/csv')}
    >
      Download table (CSV)
    </Button>
  </div>
</div>
