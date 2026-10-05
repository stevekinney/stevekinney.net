<script lang="ts">
  import { ArrowLeftRight } from '@lucide/svelte';

  import Button from '$lib/components/button';

  import { roleHints, roleLabels, roles } from './columns';
  import type { ColumnMapping, ColumnReport, Role } from './columns';
  import type { Dataset } from './dataset';
  import { formatCount } from './display';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';

  type Props = {
    columns: string[];
    mapping: ColumnMapping;
    report: ColumnReport;
    dataset: Dataset;
    /** Whether there's an outcome a verdict could be about. */
    hasOutcome: boolean;
    /** Show the column mapping for uploaded or pasted data. */
    editable: boolean;
    ready: boolean;
    onMap: (role: Role, index: number | null) => void;
    onSwap: () => void;
  };

  const { columns, mapping, report, dataset, hasOutcome, editable, ready, onMap, onSwap }: Props =
    $props();

  const used = $derived(dataset.rows.length);
  // Every skipped row is an issue, so the rest of the issues are values left blank.
  const skipped = $derived(dataset.total - dataset.rows.length);
  const blanks = $derived(dataset.issueCount - skipped);
  const counts = $derived(
    dataset.labels.map((label) => dataset.rows.filter((row) => row.condition === label).length),
  );
  const hidden = $derived(dataset.issueCount - dataset.issues.length);
</script>

<div class="space-y-4" data-testid="data-report">
  <p class="text-slate-700 dark:text-slate-200" data-testid="row-summary">
    Read {formatCount(dataset.total)}
    {dataset.total === 1 ? 'row' : 'rows'}: {formatCount(used)} used{dataset.total - used > 0
      ? `, ${formatCount(dataset.total - used)} skipped`
      : ''}.
    {#if dataset.labels.length === 2}
      <span class="[overflow-wrap:anywhere]">
        A is “{dataset.labels[0]}” ({formatCount(counts[0])}), B is “{dataset.labels[1]}” ({formatCount(
          counts[1],
        )}).
      </span>
    {/if}
  </p>

  {#if dataset.labels.length === 2}
    <Button
      variant="secondary"
      size="small"
      icon={ArrowLeftRight}
      disabled={!ready}
      onclick={onSwap}
    >
      Swap A and B
    </Button>
  {/if}

  {#if editable && columns.length > 0}
    <details open class="rounded-lg border border-slate-200 dark:border-slate-700">
      <summary class="cursor-pointer p-3 font-semibold text-slate-900 dark:text-white">
        Columns
      </summary>
      <div class="grid gap-4 border-t border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
        {#each roles as role (role)}
          <div class="min-w-0 space-y-1">
            <label for="map-{role}" class={labelClasses}>{roleLabels[role]}</label>
            <select
              id="map-{role}"
              disabled={!ready}
              value={mapping[role] === null ? '' : String(mapping[role])}
              onchange={(event) => {
                const { value } = event.currentTarget;
                onMap(role, value === '' ? null : Number(value));
              }}
              class="{fieldClasses} w-full max-w-full"
            >
              <option value="">None</option>
              {#each columns as column, index (index)}
                <option value={String(index)}>{column || `Column ${index + 1}`}</option>
              {/each}
            </select>
            <p class={hintClasses}>{roleHints[role]}</p>
          </div>
        {/each}
      </div>
    </details>
  {/if}

  {#if report.unknown.length > 0}
    <p
      class="text-sm [overflow-wrap:anywhere] text-slate-600 dark:text-slate-300"
      data-testid="unknown-columns"
    >
      Not used: {report.unknown.map((column) => `“${column}”`).join(', ')}.
    </p>
  {/if}

  {#if report.vanity.length > 0 || !hasOutcome}
    <div
      role="note"
      aria-labelledby="vanity-heading"
      data-testid="vanity-notice"
      class="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p id="vanity-heading" class="font-bold">
        {hasOutcome ? 'Some of this isn’t an outcome' : 'This isn’t an outcome'}
      </p>
      {#if !hasOutcome}
        <p>
          There’s no column for time to an accepted result, rework, or review minutes, so there’s
          nothing to give a verdict on. Activity going up doesn’t mean the work got better.
        </p>
      {/if}
      {#if report.vanity.length > 0}
        <ul class="list-disc space-y-1 pl-5">
          {#each report.vanity as entry (entry.column)}
            <li>
              <strong class="[overflow-wrap:anywhere]">{entry.column}</strong>
              ({entry.label.toLowerCase()}):
              {entry.reason}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if dataset.issues.length > 0}
    <details
      class="rounded-lg border border-slate-200 dark:border-slate-700"
      data-testid="row-issues"
    >
      <summary class="cursor-pointer p-3 font-semibold text-slate-900 dark:text-white">
        {skipped > 0 ? `${formatCount(skipped)} skipped` : 'No rows skipped'}{blanks > 0
          ? `, ${formatCount(blanks)} ${blanks === 1 ? 'value' : 'values'} left blank`
          : ''}
      </summary>
      <ul
        class="max-h-64 space-y-1 overflow-y-auto border-t border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
      >
        {#each dataset.issues as issue, index (index)}
          <li class="[overflow-wrap:anywhere]">
            Row {formatCount(issue.row)}{issue.skipped ? ' skipped' : ''}: {issue.message}.
          </li>
        {/each}
        {#if hidden > 0}
          <li>…and {formatCount(hidden)} more.</li>
        {/if}
      </ul>
    </details>
  {/if}
</div>
