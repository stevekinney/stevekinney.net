<script lang="ts">
  import { ArrowDown, ArrowUp, GripVertical } from '@lucide/svelte';
  import { tick } from 'svelte';

  import Button from '$lib/components/button';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';
  import type { SourceFile } from '$lib/experiments/dropped-files';

  import { formatPercent, formatTokens } from './budget';
  import type { Scenario } from './budget';
  import { downloadText } from './download';
  import {
    addIntake,
    calibrateFromFile,
    clearEvidence,
    moveFile,
    setAllSelected,
    setSelected,
    sortEvidence,
  } from './evidence-state';
  import type { EvidenceState } from './evidence-state';
  import { describeSkip, formatBytes, isDependencyFolder, readSources } from './file-intake';
  import {
    exportPaths,
    fitModes,
    maximumCharactersPerToken,
    minimumCharactersPerToken,
    suggestCuts,
    suggestTermReductions,
  } from './fit-check';
  import type { FitPlan, EvidenceSummary, SortKey } from './fit-check';
  import { fieldClasses, hintClasses, labelClasses } from './field-styles';
  import { getReady } from './ready-context';
  import { reorderable } from './reorder-action';
  import ValueField from './value-field.svelte';
  import { parseTokenCount } from '$lib/experiments/format';

  type Props = {
    evidence: EvidenceState;
    plan: FitPlan;
    summary: EvidenceSummary | null;
    scenario: Scenario;
    usable: number;
    onChange: (next: EvidenceState) => void;
  };

  const { evidence, plan, summary, scenario, usable, onChange }: Props = $props();

  const isReady = getReady();

  const megabyte = 1024 * 1024;
  const pageSize = 200;

  let busy = $state(false);
  let progress = $state<string | null>(null);
  let status = $state<string | null>(null);
  let visibleCount = $state(100);
  let sortedBy = $state<{ key: SortKey; descending: boolean } | null>(null);
  let calibrationFile = $state('');
  let calibrationText = $state('');
  let calibrationMessage = $state<{ text: string; ok: boolean } | null>(null);
  let tableBody: HTMLElement | undefined = $state();

  // Folders skipped while a drop is walked. The drop zone asks `enterFolder`
  // before it reads a folder, so this is where the skips are noticed.
  let skippedFolders = new Set<string>();

  const enterFolder = (path: string): boolean => {
    if (!evidence.skipFolders || !isDependencyFolder(path)) return true;

    skippedFolders.add(path);

    return false;
  };

  const pluralize = (count: number, noun: string): string =>
    `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;

  const loadFiles = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (busy) {
      skippedFolders = new Set();

      return;
    }

    busy = true;
    status = null;

    try {
      const sources = await source;
      const intake = await readSources(sources, evidence.maximumBytes, (done, total) => {
        progress = `Reading file ${done.toLocaleString('en-US')} of ${total.toLocaleString('en-US')}…`;
      });
      const folders = [...skippedFolders];
      const skipped = intake.skipped.length + folders.length;

      onChange(addIntake(evidence, intake, folders));
      visibleCount = Math.max(visibleCount, 100);
      status =
        intake.files.length === 0 && skipped === 0
          ? 'That didn’t include any files.'
          : `Read ${pluralize(intake.files.length, 'file')}${
              skipped > 0 ? `, skipped ${skipped.toLocaleString('en-US')}` : ''
            }.`;
    } catch {
      status = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      busy = false;
      progress = null;
      skippedFolders = new Set();
    }
  };

  const parseCharactersPerToken = (text: string): number | null => {
    if (!/^\d+(?:\.\d+)?$/.test(text.trim())) return null;

    const parsed = Number(text);

    return parsed >= minimumCharactersPerToken && parsed <= maximumCharactersPerToken
      ? parsed
      : null;
  };

  const formatCharactersPerToken = (value: number): string => String(Math.round(value * 100) / 100);

  const parseMegabytes = (text: string): number | null => {
    if (!/^\d+(?:\.\d+)?$/.test(text.trim())) return null;

    const parsed = Number(text);

    return parsed > 0 && parsed <= 1024 ? parsed : null;
  };

  const sortBy = (key: SortKey): void => {
    const descending = sortedBy?.key === key ? !sortedBy.descending : key === 'size';

    sortedBy = { key, descending };
    onChange(sortEvidence(evidence, key, descending));
  };

  const focusMove = async (id: string, direction: 'up' | 'down'): Promise<void> => {
    await tick();

    const buttons = [...(tableBody?.querySelectorAll<HTMLButtonElement>('[data-move]') ?? [])];
    const preferred = buttons.find((button) => button.dataset.move === `${id}:${direction}`);
    const other = buttons.find(
      (button) => button.dataset.move === `${id}:${direction === 'up' ? 'down' : 'up'}`,
    );

    (preferred && !preferred.disabled ? preferred : other)?.focus();
  };

  const move = (from: number, to: number): void => {
    if (to < 0 || to >= evidence.files.length) return;

    sortedBy = null;
    if (to >= visibleCount) visibleCount = to + 1;
    onChange(moveFile(evidence, from, to));
  };

  const moveWithKeyboard = (from: number, direction: 'up' | 'down'): void => {
    const id = evidence.files[from].id;

    move(from, direction === 'up' ? from - 1 : from + 1);
    void focusMove(id, direction);
  };

  const includedFiles = $derived(
    evidence.files.flatMap((file, index) =>
      plan.statuses[index] === 'included'
        ? [{ id: file.id, path: file.path, tokens: plan.tokens[index] }]
        : [],
    ),
  );

  const cuts = $derived(suggestCuts(includedFiles, usable));
  const reductions = $derived(
    summary && !summary.fits ? suggestTermReductions(scenario, summary.over) : [],
  );

  const chosenCalibrationFile = $derived(
    evidence.files.some((file) => file.id === calibrationFile)
      ? calibrationFile
      : (evidence.files[0]?.id ?? ''),
  );

  const calibrate = (): void => {
    const trueTokens = parseTokenCount(calibrationText);
    const file = evidence.files.find((entry) => entry.id === chosenCalibrationFile);
    const next = trueTokens && file ? calibrateFromFile(evidence, file.id, trueTokens) : null;

    if (!next || !file) {
      calibrationMessage = {
        ok: false,
        text: 'Enter the file’s true token count, such as 80k. It has to give between 0.1 and 100 characters per token.',
      };

      return;
    }

    onChange(next);
    calibrationMessage = {
      ok: true,
      text: `Calibrated to ${formatCharactersPerToken(next.charactersPerToken)} characters per token, from ${file.path}. Every file was re-estimated.`,
    };
  };

  const exportFileList = (): void =>
    downloadText(
      'evidence-files.txt',
      exportPaths(includedFiles.map((file) => file.path)),
      'text/plain',
    );

  const statusLabels = {
    included: 'Included',
    unchecked: 'Not included',
    overflow: 'Doesn’t fit',
  } as const;

  const cell = 'px-3 py-2 align-middle';
  const iconButton =
    'focus-visible:outline-primary-600 inline-flex size-8 cursor-pointer items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
</script>

<div class="space-y-6">
  <FileDropZone
    title="Drop the files or folders you want the model to work with"
    draggingTitle="Drop to check these files"
    folders
    captureWindowDrops
    {busy}
    {progress}
    {status}
    {enterFolder}
    fileButtonLabel="Choose files"
    folderButtonLabel="Choose a folder"
    onFiles={loadFiles}
  >
    Source files, documents, logs, and transcripts all work. Only their sizes are counted. Nothing
    you drop is uploaded, and no file names go in a shared link.
  </FileDropZone>

  <div class="grid gap-4 sm:grid-cols-3">
    <div class="space-y-1.5">
      <label for="characters-per-token" class={labelClasses}>Characters per token (estimate)</label>
      <ValueField
        id="characters-per-token"
        value={evidence.charactersPerToken}
        format={formatCharactersPerToken}
        parse={parseCharactersPerToken}
        onChange={(value) => onChange({ ...evidence, charactersPerToken: value })}
        describedBy="characters-per-token-hint"
        invalidMessage="Enter a number from 0.1 to 100, such as 4."
      />
      <p id="characters-per-token-hint" class={hintClasses}>
        English prose and code are usually near 4. Every token count here is an estimate.
      </p>
    </div>
    <div class="space-y-1.5">
      <label for="maximum-megabytes" class={labelClasses}>Skip files over (MB)</label>
      <ValueField
        id="maximum-megabytes"
        value={evidence.maximumBytes / megabyte}
        format={(value) => String(Math.round(value * 100) / 100)}
        parse={parseMegabytes}
        onChange={(value) => onChange({ ...evidence, maximumBytes: Math.round(value * megabyte) })}
        describedBy="maximum-megabytes-hint"
        invalidMessage="Enter a size above zero, up to 1024."
      />
      <p id="maximum-megabytes-hint" class={hintClasses}>Applies to what you add next.</p>
    </div>
    <div class="space-y-1.5">
      <span class={labelClasses}>Folders</span>
      <label class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input
          type="checkbox"
          checked={evidence.skipFolders}
          disabled={!isReady()}
          onchange={(event) => onChange({ ...evidence, skipFolders: event.currentTarget.checked })}
          class="accent-primary-600 mt-0.5 size-4"
        />
        <span>
          Skip dependency and build folders, such as <code>node_modules</code>
          and <code>dist</code>. Applies to the next folder you add.
        </span>
      </label>
    </div>
  </div>

  {#if evidence.files.length === 0 && evidence.skipped.length === 0}
    <p class="text-slate-600 dark:text-slate-300" data-testid="no-files">
      No files yet. Add some to see how much of the usable budget they take.
    </p>
  {/if}

  {#if evidence.files.length > 0}
    <div class="space-y-4">
      <div class="space-y-2">
        <div role="group" aria-label="How to choose which files go in" class="flex flex-wrap gap-2">
          {#each fitModes as option (option.mode)}
            <button
              type="button"
              disabled={!isReady()}
              aria-pressed={evidence.mode === option.mode}
              onclick={() => onChange({ ...evidence, mode: option.mode })}
              class="focus-visible:outline-primary-600 aria-pressed:bg-primary-700 dark:aria-pressed:bg-primary-300 cursor-pointer rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 aria-pressed:border-transparent aria-pressed:text-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-pressed:text-slate-900"
            >
              {option.label}
            </button>
          {/each}
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          {fitModes.find((option) => option.mode === evidence.mode)?.description}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          disabled={!isReady()}
          onclick={() => sortBy('size')}
        >
          Sort by size
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={!isReady()}
          onclick={() => sortBy('name')}
        >
          Sort by name
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={!isReady()}
          onclick={() => onChange(setAllSelected(evidence, true))}
        >
          Check all
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={!isReady()}
          onclick={() => onChange(setAllSelected(evidence, false))}
        >
          Uncheck all
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={!isReady() || includedFiles.length === 0}
          onclick={exportFileList}
        >
          Export the included files
        </Button>
        <Button
          variant="ghost"
          size="small"
          disabled={!isReady()}
          onclick={() => {
            onChange(clearEvidence(evidence));
            sortedBy = null;
            status = null;
          }}
        >
          Clear all files
        </Button>
      </div>

      <p class="text-sm text-slate-600 dark:text-slate-300">
        The list is in priority order. Drag a row, or use its move buttons, to change it. Sorting
        replaces your order. The export lists the included files, one path per line.
      </p>

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        class="focus-visible:outline-primary-600 relative -mx-4 overflow-x-auto px-4 focus-visible:outline-2 md:mx-0 md:px-0"
        tabindex="0"
        role="region"
        aria-label="Files to include, in priority order"
      >
        <table class="w-full min-w-[40rem] border-collapse text-sm" data-testid="file-list">
          <caption class="sr-only">
            Your files in priority order, with an estimate of the tokens each takes and its share of
            the usable budget.
          </caption>
          <thead>
            <tr
              class="border-b border-slate-300 text-left text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              <th scope="col" class="{cell} font-semibold">Include</th>
              <th scope="col" class="{cell} font-semibold">Order</th>
              <th scope="col" class="{cell} font-semibold">File</th>
              <th scope="col" class="{cell} text-right font-semibold">Estimated tokens</th>
              <th scope="col" class="{cell} text-right font-semibold">Share of usable</th>
              <th scope="col" class="{cell} font-semibold">Fit</th>
            </tr>
          </thead>
          <tbody bind:this={tableBody} use:reorderable={{ onMove: move }}>
            {#each evidence.files.slice(0, visibleCount) as file, index (file.id)}
              {@const fitStatus = plan.statuses[index]}
              <tr
                draggable="true"
                data-index={index}
                data-path={file.path}
                data-status={fitStatus}
                class="border-b border-slate-200 dark:border-slate-800"
              >
                <td class={cell}>
                  <input
                    type="checkbox"
                    checked={file.selected}
                    disabled={!isReady()}
                    aria-label="Include {file.path}"
                    onchange={(event) =>
                      onChange(setSelected(evidence, file.id, event.currentTarget.checked))}
                    class="accent-primary-600 size-4"
                  />
                </td>
                <td class={cell}>
                  <span class="flex items-center gap-1">
                    <GripVertical
                      aria-hidden="true"
                      class="size-4 flex-none cursor-grab text-slate-400"
                    />
                    <button
                      type="button"
                      class={iconButton}
                      disabled={!isReady() || index === 0}
                      data-move="{file.id}:up"
                      aria-label="Move {file.path} up"
                      onclick={() => moveWithKeyboard(index, 'up')}
                    >
                      <ArrowUp aria-hidden="true" class="size-4" />
                    </button>
                    <button
                      type="button"
                      class={iconButton}
                      disabled={!isReady() || index === evidence.files.length - 1}
                      data-move="{file.id}:down"
                      aria-label="Move {file.path} down"
                      onclick={() => moveWithKeyboard(index, 'down')}
                    >
                      <ArrowDown aria-hidden="true" class="size-4" />
                    </button>
                  </span>
                </td>
                <th
                  scope="row"
                  class="{cell} text-left font-normal break-all text-slate-900 dark:text-white"
                >
                  {file.path}
                  {#if file.characters === 0}<span class={hintClasses}>(empty)</span>{/if}
                </th>
                <td
                  class="{cell} text-right whitespace-nowrap tabular-nums"
                  title="{plan.tokens[index].toLocaleString('en-US')} tokens, estimated"
                >
                  {formatTokens(plan.tokens[index])}
                </td>
                <td class="{cell} text-right whitespace-nowrap tabular-nums">
                  {usable > 0 ? formatPercent((plan.tokens[index] / usable) * 100) : '—'}
                </td>
                <td
                  class="{cell} whitespace-nowrap {fitStatus === 'overflow'
                    ? 'font-semibold text-amber-800 dark:text-amber-300'
                    : fitStatus === 'unchecked'
                      ? 'text-slate-500 dark:text-slate-400'
                      : ''}"
                >
                  {statusLabels[fitStatus]}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if evidence.files.length > visibleCount}
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-sm text-slate-600 dark:text-slate-300">
            Showing {visibleCount.toLocaleString('en-US')} of {evidence.files.length.toLocaleString(
              'en-US',
            )}
            files. Totals count all of them.
          </p>
          <Button variant="secondary" size="small" onclick={() => (visibleCount += pageSize)}>
            Show {Math.min(pageSize, evidence.files.length - visibleCount).toLocaleString('en-US')} more
          </Button>
        </div>
      {/if}

      {#if summary && !summary.fits}
        <div
          class="space-y-2 rounded-md border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50"
          data-testid="what-to-cut"
        >
          <p class="font-semibold">What to cut</p>
          {#if cuts && cuts.files.length > 0 && cuts.possible}
            <p>
              Remove {pluralize(cuts.files.length, 'file')} to fit:
              {#each cuts.files as file, index (file.id)}
                <code class="break-all">{file.path}</code> ({formatTokens(file.tokens)}){index <
                cuts.files.length - 1
                  ? ','
                  : '.'}
              {/each}
              That leaves {formatTokens(cuts.remaining)} of {formatTokens(usable)}.
            </p>
          {:else}
            <p>
              Removing every file still wouldn’t fit, because the claims against the window leave
              nothing for evidence. Free up room in the terms above first.
            </p>
          {/if}
          {#if reductions.length > 0}
            <p>
              Or {reductions
                .slice(0, 1)
                .map(
                  (reduction) =>
                    `move ${reduction.phrase} from ${formatTokens(reduction.from)} to ${formatTokens(reduction.to)}`,
                )
                .join('')}.
              {#if reductions.length > 1}
                Other single changes that would do it:
                {reductions
                  .slice(1)
                  .map(
                    (reduction) =>
                      `${reduction.phrase} from ${formatTokens(reduction.from)} to ${formatTokens(reduction.to)}`,
                  )
                  .join('; ')}.
              {/if}
            </p>
          {:else}
            <p>No single term is large enough to make up the difference on its own.</p>
          {/if}
        </div>
      {/if}

      <fieldset class="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-700">
        <legend class="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Calibrate the estimate
        </legend>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          If you know the true token count of one file, enter it, and the characters per token
          follow from it.
        </p>
        <div class="grid items-end gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <div class="space-y-1.5">
            <label for="calibration-file" class={labelClasses}>File</label>
            <select
              id="calibration-file"
              value={chosenCalibrationFile}
              disabled={!isReady()}
              onchange={(event) => (calibrationFile = event.currentTarget.value)}
              class="{fieldClasses} cursor-pointer"
            >
              {#each evidence.files as file (file.id)}
                <option value={file.id}>{file.path}</option>
              {/each}
            </select>
          </div>
          <div class="space-y-1.5">
            <label for="calibration-tokens" class={labelClasses}>True token count</label>
            <input
              id="calibration-tokens"
              type="text"
              bind:value={calibrationText}
              disabled={!isReady()}
              autocomplete="off"
              spellcheck="false"
              placeholder="80k"
              onkeydown={(event) => event.key === 'Enter' && calibrate()}
              class="{fieldClasses} tabular-nums"
            />
          </div>
          <Button variant="secondary" disabled={!isReady()} onclick={calibrate}>Calibrate</Button>
        </div>
        {#if calibrationMessage}
          <p
            role="status"
            class="text-sm {calibrationMessage.ok
              ? 'text-slate-700 dark:text-slate-200'
              : 'text-red-700 dark:text-red-400'}"
            data-testid="calibration-message"
          >
            {calibrationMessage.text}
          </p>
        {/if}
      </fieldset>
    </div>
  {/if}

  {#if evidence.skipped.length > 0}
    <details class="max-w-3xl" data-testid="skipped-files">
      <summary
        class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
      >
        Skipped ({evidence.skipped.length.toLocaleString('en-US')})
      </summary>
      <ul class="mt-3 space-y-1.5 text-sm">
        {#each evidence.skipped as entry (entry.path)}
          <li class="text-slate-700 dark:text-slate-200">
            <code class="break-all">{entry.path}</code>:
            {describeSkip(entry, evidence.maximumBytes)}{entry.bytes !== null &&
            entry.reason !== 'binary'
              ? ` (${formatBytes(entry.bytes)})`
              : ''}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</div>
