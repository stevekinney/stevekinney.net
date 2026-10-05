<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import { describeFilters } from './analysis';
  import type { Analysis, Filters } from './analysis';
  import type { AuditData } from './audit-data';
  import ClustersTable from './clusters-table.svelte';
  import ControlRowsPanel from './control-rows-panel.svelte';
  import type { FixMark } from './control-rows';
  import { copyText } from './copy-text';
  import { buildSummary, toCsv } from './digest';
  import { downloadText } from './download';
  import {
    bodyClasses,
    buttonClasses,
    cellClasses,
    headCellClasses,
    headingClasses,
    tableClasses,
    tableRegionClasses,
    wrapAnywhere,
  } from './field-styles';
  import FiltersBar from './filters-bar.svelte';
  import LazySection from './lazy-section.svelte';
  import OverviewTiles from './overview-tiles.svelte';
  import type { PriceRow } from './pricing';
  import type { Rule } from './rules';
  import TimelinePanel from './timeline-panel.svelte';

  type Props = {
    analysis: Analysis;
    records: AuditData;
    filters: Filters;
    rules: Rule[];
    prices: PriceRow[];
    defaultPrices: PriceRow[];
    pricesUpdated: string;
    marks: FixMark[];
    onFilters: (filters: Filters) => void;
    onRules: (rules: Rule[]) => void;
    onPrices: (prices: PriceRow[]) => void;
    onMarks: (marks: FixMark[]) => void;
  };

  const {
    analysis,
    records,
    filters,
    rules,
    prices,
    defaultPrices,
    pricesUpdated,
    marks,
    onFilters,
    onRules,
    onPrices,
    onMarks,
  }: Props = $props();

  const scope = $derived(describeFilters(filters));
  const lastActiveDay = $derived(analysis.activeDays.at(-1) ?? analysis.options.lastDay);
  let copied = $state<string | null>(null);

  const copySummary = async (): Promise<void> => {
    const ok = await copyText(buildSummary(analysis.overview, analysis.clusters, scope));
    copied = ok ? 'Copied the summary as Markdown.' : 'Couldn’t reach the clipboard.';
  };

  const sectionClasses = 'space-y-4';
</script>

<div class="space-y-12">
  <section aria-labelledby="overview-heading" class={sectionClasses}>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="overview-heading" class={headingClasses}>Overview</h2>
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite"
          >{copied ?? ''}</span
        >
        <button type="button" class={buttonClasses} onclick={() => void copySummary()}>
          Copy summary
        </button>
      </div>
    </div>
    <OverviewTiles overview={analysis.overview} />
  </section>

  <section aria-labelledby="filters-heading" class={sectionClasses}>
    <h2 id="filters-heading" class={headingClasses}>Filters</h2>
    <p class={bodyClasses}>
      Every panel below follows these. Tool and category narrow the failures.
    </p>
    <FiltersBar
      {filters}
      options={analysis.options}
      categories={analysis.categories}
      onChange={onFilters}
    />
  </section>

  <section aria-labelledby="clusters-heading" class={sectionClasses}>
    <h2 id="clusters-heading" class={headingClasses}>Top clusters</h2>
    <ClustersTable
      clusters={analysis.clusters}
      categories={analysis.categories}
      {marks}
      controlRows={analysis.controlRows}
      returns={analysis.returns}
      lastDay={lastActiveDay}
      {onMarks}
    />
  </section>

  <section aria-labelledby="timeline-heading" class={sectionClasses}>
    <div class="space-y-1">
      <h2 id="timeline-heading" class={headingClasses}>Failures per day</h2>
      <p class={bodyClasses}>Stacked by category, so a fix shows up as a cliff.</p>
    </div>
    <TimelinePanel timeline={analysis.timeline} categories={analysis.categories} />
  </section>

  <section aria-labelledby="control-heading" class={sectionClasses}>
    <div class="space-y-1">
      <h2 id="control-heading" class={headingClasses}>Control rows</h2>
      <p class={bodyClasses}>
        A problem you fixed should stay at zero. These are the ones you marked.
      </p>
    </div>
    <ControlRowsPanel rows={analysis.controlRows} {marks} lastDay={lastActiveDay} {onMarks} />
  </section>

  <section aria-labelledby="cost-heading" class={sectionClasses}>
    <h2 id="cost-heading" class={headingClasses}>Cost and cache</h2>
    <LazySection
      name="the cost panel"
      load={() => import('./cost-panel.svelte')}
      props={{ cost: analysis.cost }}
    />
  </section>

  <section aria-labelledby="compaction-heading" class={sectionClasses}>
    <h2 id="compaction-heading" class={headingClasses}>Compactions</h2>
    <LazySection
      name="the compaction panel"
      load={() => import('./compaction-panel.svelte')}
      props={{ compactions: analysis.compactions, summary: analysis.overview.compactions }}
    />
  </section>

  <section aria-labelledby="compare-heading" class={sectionClasses}>
    <div class="space-y-1">
      <h2 id="compare-heading" class={headingClasses}>Compare two periods</h2>
      <p class={bodyClasses}>
        Which clusters appeared, went away, or moved by more than a threshold.
      </p>
    </div>
    <LazySection
      name="the comparison"
      load={() => import('./compare-panel.svelte')}
      props={{
        clusters: analysis.clusters,
        firstDay: analysis.options.firstDay,
        lastDay: analysis.options.lastDay,
      }}
    />
  </section>

  <section aria-labelledby="digest-heading" class={sectionClasses}>
    <h2 id="digest-heading" class={headingClasses}>Digest for a model</h2>
    <LazySection
      name="the digest"
      load={() => import('./digest-panel.svelte')}
      props={{ overview: analysis.overview, clusters: analysis.clusters, scope }}
    />
  </section>

  <section aria-labelledby="read-heading" class={sectionClasses}>
    <h2 id="read-heading" class={headingClasses}>What was read</h2>
    <p class={bodyClasses}>
      {formatTokenCount(records.files.length)} file{records.files.length === 1 ? '' : 's'}, {formatTokenCount(
        records.skippedLines,
      )} malformed line{records.skippedLines === 1 ? '' : 's'} skipped. Sessions can come from several
      Claude Code versions:
    </p>
    <button
      type="button"
      class={buttonClasses}
      onclick={() =>
        downloadText(
          'versions.csv',
          toCsv(
            ['Claude Code version', 'Sessions'],
            analysis.versions.map((row) => [row.version, row.sessions]),
          ),
          'text/csv',
        )}
    >
      Download versions as CSV
    </button>
    <div class={tableRegionClasses} role="region" aria-label="Versions table" tabindex="-1">
      <table class={tableClasses} data-testid="versions-table">
        <thead>
          <tr>
            <th scope="col" class={headCellClasses}>Claude Code version</th>
            <th scope="col" class="{headCellClasses} text-right">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {#each analysis.versions as row (row.version)}
            <tr>
              <th scope="row" class="{cellClasses} font-normal"
                ><span class={wrapAnywhere}>{row.version}</span></th
              >
              <td class="{cellClasses} text-right">{formatTokenCount(row.sessions)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section aria-labelledby="settings-heading" class={sectionClasses}>
    <h2 id="settings-heading" class={headingClasses}>Rules and prices</h2>
    <LazySection
      name="the rules and prices"
      load={() => import('./settings-panel.svelte')}
      props={{ rules, prices, defaultPrices, pricesUpdated, onRules, onPrices }}
    />
  </section>
</div>
