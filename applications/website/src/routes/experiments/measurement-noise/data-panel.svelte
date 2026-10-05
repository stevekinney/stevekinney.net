<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import { MAX_GRID_ROWS } from './entry-grid';
  import type { GridState } from './entry-grid';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';

  export type InputMode = 'upload' | 'paste' | 'type';

  type Props = {
    mode: InputMode;
    ready: boolean;
    pasteText: string;
    grid: GridState;
    /** While a file is read. */
    progress: string | null;
    status: string | null;
    error: string | null;
    onMode: (mode: InputMode) => void;
    onPaste: (text: string) => void;
    onGrid: (grid: GridState) => void;
    onFiles: (files: Promise<SourceFile[]>) => void;
  };

  const {
    mode,
    ready,
    pasteText,
    grid,
    progress,
    status,
    error,
    onMode,
    onPaste,
    onGrid,
    onFiles,
  }: Props = $props();

  const modes: { value: InputMode; label: string }[] = [
    { value: 'upload', label: 'Upload a file' },
    { value: 'paste', label: 'Paste CSV' },
    { value: 'type', label: 'Type it in' },
  ];

  const setRow = (index: number, side: 'a' | 'b', value: string): void =>
    onGrid({
      ...grid,
      rows: grid.rows.map((row, position) =>
        position === index ? { ...row, [side]: value } : row,
      ),
    });

  const removeRow = (index: number): void =>
    onGrid({ ...grid, rows: grid.rows.filter((_, position) => position !== index) });

  const addRow = (): void => onGrid({ ...grid, rows: [...grid.rows, { a: '', b: '' }] });

  const pastePlaceholder = ['condition,task,minutes', 'A,task-1,40', 'B,task-1,35'].join('\n');

  const labelA = $derived(grid.labelA.trim() || 'A');
  const labelB = $derived(grid.labelB.trim() || 'B');
</script>

<div class="space-y-4">
  <div
    role="group"
    aria-label="How to bring your data"
    class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
  >
    {#each modes as option (option.value)}
      <button
        type="button"
        disabled={!ready}
        aria-pressed={mode === option.value}
        onclick={() => onMode(option.value)}
        class="focus-visible:outline-primary-600 flex-1 cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm aria-pressed:ring-1 aria-pressed:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:aria-pressed:bg-slate-600 dark:aria-pressed:text-white dark:aria-pressed:ring-slate-500"
      >
        {option.label}
      </button>
    {/each}
  </div>

  {#if mode === 'upload'}
    <FileDropZone
      title="Drop a CSV or JSON file of task timings"
      fileButtonLabel="Choose a file"
      accept=".csv,.tsv,.txt,.json,.jsonl,.ndjson"
      captureWindowDrops
      busy={progress !== null}
      {progress}
      {status}
      {onFiles}
    >
      <p>
        One row per task. Columns are matched by name: <code>condition</code>, <code>task</code>,
        <code>minutes</code> or <code>duration</code>, <code>accepted</code>, <code>rework</code>,
        <code>review_minutes</code>, and <code>cost</code>. Only <code>condition</code> and one outcome
        are required. You can reassign columns after it’s read.
      </p>
    </FileDropZone>
  {:else if mode === 'paste'}
    <div class="space-y-1.5">
      <label for="paste-data" class={labelClasses}>Paste CSV or JSON</label>
      <textarea
        id="paste-data"
        rows="8"
        disabled={!ready}
        value={pasteText}
        oninput={(event) => onPaste(event.currentTarget.value)}
        spellcheck="false"
        placeholder={pastePlaceholder}
        class="{fieldClasses} w-full font-mono text-sm"></textarea>
      <p class={hintClasses}>
        What you paste is read in this tab and never sent anywhere. The first line names the
        columns.
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label for="grid-label-a" class={labelClasses}>Name for A, the baseline</label>
          <input
            id="grid-label-a"
            type="text"
            disabled={!ready}
            value={grid.labelA}
            oninput={(event) => onGrid({ ...grid, labelA: event.currentTarget.value })}
            class="{fieldClasses} w-full"
          />
        </div>
        <div class="space-y-1.5">
          <label for="grid-label-b" class={labelClasses}>Name for B, the new way</label>
          <input
            id="grid-label-b"
            type="text"
            disabled={!ready}
            value={grid.labelB}
            oninput={(event) => onGrid({ ...grid, labelB: event.currentTarget.value })}
            class="{fieldClasses} w-full"
          />
        </div>
      </div>

      <label class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          disabled={!ready}
          checked={grid.paired}
          onchange={(event) => onGrid({ ...grid, paired: event.currentTarget.checked })}
          class="accent-primary-600 mt-1"
        />
        <span>Each row is the same task, done both ways. Leave this off for different tasks.</span>
      </label>

      <div class="relative overflow-x-auto">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">Minutes per task, typed in</caption>
          <thead>
            <tr
              class="border-b border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              <th scope="col" class="py-2 pr-2 font-semibold">{grid.paired ? 'Task' : 'Row'}</th>
              <th scope="col" class="px-2 py-2 font-semibold">{labelA} minutes</th>
              <th scope="col" class="px-2 py-2 font-semibold">{labelB} minutes</th>
              <th scope="col" class="py-2 pl-2"><span class="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {#each grid.rows as row, index (index)}
              <tr class="border-b border-slate-100 dark:border-slate-800">
                <th
                  scope="row"
                  class="py-1.5 pr-2 font-normal text-slate-600 tabular-nums dark:text-slate-300"
                >
                  {index + 1}
                </th>
                <td class="px-2 py-1.5">
                  <input
                    type="text"
                    inputmode="decimal"
                    disabled={!ready}
                    aria-label="{labelA} minutes, row {index + 1}"
                    value={row.a}
                    oninput={(event) => setRow(index, 'a', event.currentTarget.value)}
                    class="{fieldClasses} w-20 py-1 sm:w-28"
                  />
                </td>
                <td class="px-2 py-1.5">
                  <input
                    type="text"
                    inputmode="decimal"
                    disabled={!ready}
                    aria-label="{labelB} minutes, row {index + 1}"
                    value={row.b}
                    oninput={(event) => setRow(index, 'b', event.currentTarget.value)}
                    class="{fieldClasses} w-20 py-1 sm:w-28"
                  />
                </td>
                <td class="py-1.5 pl-2">
                  <button
                    type="button"
                    disabled={!ready || grid.rows.length <= 1}
                    aria-label="Remove row {index + 1}"
                    onclick={() => removeRow(index)}
                    class="focus-visible:outline-primary-600 cursor-pointer rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-700 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
                  >
                    <Trash2 aria-hidden="true" class="size-4" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <Button
        variant="secondary"
        size="small"
        icon={Plus}
        disabled={!ready || grid.rows.length >= MAX_GRID_ROWS}
        onclick={addRow}
      >
        Add a row
      </Button>
    </div>
  {/if}

  {#if error}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{error}</p>
  {/if}
</div>
