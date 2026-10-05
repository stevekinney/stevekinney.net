<script lang="ts">
  import { formatTokenCount } from '$lib/experiments/format';

  import BarChart from './bar-chart.svelte';
  import { parseMarks, serializeMarks } from './control-rows';
  import type { ControlRow, FixMark } from './control-rows';
  import { downloadText } from './download';
  import { daysBetween } from './timeline';
  import {
    bodyClasses,
    buttonClasses,
    codeClasses,
    linkButtonClasses,
    wrapAnywhere,
  } from './field-styles';

  type Props = {
    rows: ControlRow[];
    marks: FixMark[];
    /** The last day any loaded session ran, so the chart shows the zeros after a fix. */
    lastDay: string | null;
    onMarks: (marks: FixMark[]) => void;
  };

  const { rows, marks, lastDay, onMarks }: Props = $props();

  /** Every day from the cluster's first failure to the last active day, zeros included. */
  const filledSeries = (row: ControlRow): ControlRow['series'] => {
    const first = row.series[0]?.day;
    const last = row.series.at(-1)?.day;
    if (!first || !last) return [];

    const counts = new Map(row.series.map((point) => [point.day, point.sessions]));
    const end = lastDay && lastDay > last ? lastDay : last;

    return daysBetween(first, end).map((day) => ({
      day,
      sessions: counts.get(day) ?? 0,
      after: day > row.mark.date,
    }));
  };

  let importer: HTMLInputElement | undefined = $state();
  let message = $state<string | null>(null);

  const importMarks = async (event: Event & { currentTarget: HTMLInputElement }): Promise<void> => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const parsed = parseMarks(await file.text());
    if ('error' in parsed) {
      message = parsed.error;

      return;
    }

    const merged = new Map(marks.map((mark) => [mark.key, mark]));
    for (const mark of parsed.marks) merged.set(mark.key, mark);
    onMarks([...merged.values()]);
    message = `Imported ${formatTokenCount(parsed.marks.length)} mark${parsed.marks.length === 1 ? '' : 's'}.`;
  };
</script>

<div class="space-y-4">
  {#if rows.length === 0}
    <p class={bodyClasses}>
      Nothing is marked yet. Open a cluster above and choose <strong>Mark fixed on…</strong> to keep a
      control row for it. A fix should stay at zero; if it comes back, it’s flagged here.
    </p>
  {:else}
    <ul class="space-y-4">
      {#each rows as row (row.mark.key)}
        {@const series = filledSeries(row)}
        <li
          class="space-y-3 rounded-lg border p-4 {row.regression
            ? 'border-red-400 dark:border-red-700'
            : 'border-emerald-400 dark:border-emerald-700'}"
          data-testid="control-row"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 space-y-1">
              <code class="{codeClasses} {wrapAnywhere}">{row.mark.signature}</code>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {row.mark.tool}, marked fixed on {row.mark.date}
              </p>
            </div>
            <span
              data-testid="control-status"
              class="rounded px-2 py-0.5 text-sm font-semibold {row.regression
                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'}"
            >
              {row.status}
            </span>
          </div>
          <p class="text-sm text-slate-700 dark:text-slate-200">
            {#if !row.seen}
              Not in these sessions.
            {:else}
              {formatTokenCount(row.sessionsBefore)} session{row.sessionsBefore === 1 ? '' : 's'}
              affected up to the fix, {formatTokenCount(row.sessionsAfter)} after.
              {#if row.firstReturn}
                It came back on {row.firstReturn}, {formatTokenCount(row.occurrencesAfter)} time{row.occurrencesAfter ===
                1
                  ? ''
                  : 's'}
                since.
              {/if}
            {/if}
          </p>
          {#if series.length > 0}
            <BarChart
              testId="control-chart"
              height={140}
              label="Sessions affected per day for this cluster, with the fix date marked."
              markerBefore={row.mark.date}
              markerLabel="fixed"
              bars={series.map((point) => ({
                id: point.day,
                label: point.day.slice(5),
                note: point.after ? 'After the fix' : 'Up to the fix',
                muted: !point.after,
                segments: [
                  {
                    key: 'sessions',
                    label: 'Sessions',
                    value: point.sessions,
                    fill: point.after
                      ? 'fill-red-600 dark:fill-red-400'
                      : 'fill-slate-500 dark:fill-slate-400',
                  },
                ],
              }))}
            />
            <table class="sr-only">
              <caption>Sessions affected per day</caption>
              <thead
                ><tr
                  ><th scope="col">Day</th><th scope="col">Sessions</th><th scope="col">Period</th
                  ></tr
                ></thead
              >
              <tbody>
                {#each series as point (point.day)}
                  <tr
                    ><td>{point.day}</td><td>{point.sessions}</td><td
                      >{point.after ? 'after' : 'before'}</td
                    ></tr
                  >
                {/each}
              </tbody>
            </table>
          {/if}
          <button
            type="button"
            class={linkButtonClasses}
            onclick={() => onMarks(marks.filter((mark) => mark.key !== row.mark.key))}
          >
            Remove this mark
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      class={buttonClasses}
      disabled={marks.length === 0}
      onclick={() => downloadText('fix-marks.json', serializeMarks(marks), 'application/json')}
    >
      Export marks as JSON
    </button>
    <button type="button" class={buttonClasses} onclick={() => importer?.click()}
      >Import marks</button
    >
    <input
      bind:this={importer}
      type="file"
      accept=".json,application/json"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      onchange={(event) => void importMarks(event)}
    />
    {#if message}<p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
        {message}
      </p>{/if}
  </div>
  <p class="text-xs text-slate-500 dark:text-slate-400">
    Marks are remembered in this browser as a convenience. Export them to keep them anywhere else.
  </p>
</div>
