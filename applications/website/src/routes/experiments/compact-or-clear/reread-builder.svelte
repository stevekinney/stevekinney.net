<script lang="ts">
  import { Pin, PinOff } from '@lucide/svelte';

  import Button from '$lib/components/button';
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import { bodyClasses } from './field-styles';
  import { formatTokens } from './format-tokens';
  import { enterFolder, estimateTokens, MAXIMUM_FILE_BYTES, readFileEstimates } from './reread';
  import type { FileEstimate, SkippedFile } from './reread';

  type Props = {
    files: FileEstimate[];
    skipped: SkippedFile[];
    /** Paths the person has unchecked. */
    unchecked: Record<string, true>;
    charsPerToken: number;
    /** Whether the re-read size follows the checked total. */
    pinned: boolean;
    /** Tokens in the checked files. */
    total: number;
    /** The re-read size now, which differs from `total` once the person moves the slider. */
    reread: number;
    onEstimates: (files: FileEstimate[], skipped: SkippedFile[]) => void;
    onToggle: (path: string, checked: boolean) => void;
    onPinChange: (pinned: boolean) => void;
    onClear: () => void;
  };

  const {
    files,
    skipped,
    unchecked,
    charsPerToken,
    pinned,
    total,
    reread,
    onEstimates,
    onToggle,
    onPinChange,
    onClear,
  }: Props = $props();

  let busy = $state(false);
  let status = $state<string | null>(null);
  let problem = $state<string | null>(null);

  const load = async (source: Promise<SourceFile[]>): Promise<void> => {
    if (busy) return;

    busy = true;
    problem = null;
    status = null;

    try {
      const sources = await source;

      if (sources.length === 0) {
        problem = 'That didn’t include any files.';

        return;
      }

      const estimates = await readFileEstimates(sources);
      onEstimates(estimates.files, estimates.skipped);
      status = `Read ${estimates.files.length === 1 ? '1 file' : `${estimates.files.length} files`}.`;
    } catch {
      problem = 'Those files couldn’t be read. Try choosing them again.';
    } finally {
      busy = false;
    }
  };

  const checkedCount = $derived(files.filter((file) => !unchecked[file.path]).length);
  const SKIPPED_SHOWN = 25;
  const megabytes = `${MAXIMUM_FILE_BYTES / 1_000_000} MB`;
</script>

<div class="space-y-4">
  <FileDropZone
    title="Size it from files"
    draggingTitle="Drop to size the re-read"
    folders
    {enterFolder}
    {busy}
    progress={busy ? 'Counting characters…' : null}
    {status}
    onFiles={load}
  >
    <p>
      Drop the files and folders you’d open again after a clear: source, specs, notes, logs. Their
      characters are counted in this tab and nothing is sent anywhere. Binary files and anything
      over {megabytes} are skipped, and so are folders such as <code>node_modules</code>.
    </p>
  </FileDropZone>

  {#if problem}
    <p role="alert" class="text-sm text-red-700 dark:text-red-400">{problem}</p>
  {/if}

  {#if files.length > 0 || skipped.length > 0}
    <section aria-labelledby="reread-list-heading" class="space-y-3" data-testid="reread-list">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="reread-list-heading" class="text-lg font-bold text-slate-900 dark:text-white">
            Files to re-read
          </h3>
          <p class={bodyClasses} data-testid="reread-total">
            {checkedCount} of {files.length}
            {files.length === 1 ? 'file' : 'files'} checked, an estimated
            <strong>{formatTokens(total)}</strong> tokens at {charsPerToken} characters per token. That’s
            a rough estimate, not a count.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="small"
            icon={pinned ? Pin : PinOff}
            aria-pressed={pinned}
            onclick={() => onPinChange(!pinned)}
          >
            Pin estimate
          </Button>
          <Button variant="secondary" size="small" onclick={onClear}>Clear list</Button>
        </div>
      </div>

      <p class="text-sm {bodyClasses}" aria-live="polite">
        {#if pinned}
          Pinned: the re-read size follows the checked files. Moving the slider unpins it.
        {:else}
          Not pinned: the re-read size is {formatTokens(reread)}, and the checked files come to
          {formatTokens(total)}. Pin the estimate to use the list.
        {/if}
      </p>

      {#if files.length > 0}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
          class="focus-visible:outline-primary-600 relative max-h-72 overflow-auto rounded-lg border border-slate-200 focus-visible:outline-2 dark:border-slate-700"
          tabindex="0"
          role="region"
          aria-label="Files to re-read"
        >
          <ul class="divide-y divide-slate-200 text-sm dark:divide-slate-700">
            {#each files as file (file.path)}
              <li>
                <label class="flex cursor-pointer items-center gap-3 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!unchecked[file.path]}
                    onchange={(event) => onToggle(file.path, event.currentTarget.checked)}
                    class="accent-primary-600 size-4 flex-none"
                  />
                  <span
                    class="min-w-0 flex-1 truncate text-slate-900 dark:text-white"
                    title={file.path}
                  >
                    {file.path}
                  </span>
                  <span class="flex-none text-slate-700 tabular-nums dark:text-slate-200">
                    {formatTokens(estimateTokens(file.characters, charsPerToken))} tokens
                  </span>
                </label>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if skipped.length > 0}
        <details>
          <summary
            class="cursor-pointer text-sm font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
          >
            {skipped.length} skipped
          </summary>
          <ul class="mt-2 space-y-0.5 text-sm text-slate-700 dark:text-slate-200">
            {#each skipped.slice(0, SKIPPED_SHOWN) as file (file.path)}
              <li class="break-all">{file.path}: {file.reason}</li>
            {/each}
            {#if skipped.length > SKIPPED_SHOWN}
              <li>and {skipped.length - SKIPPED_SHOWN} more.</li>
            {/if}
          </ul>
        </details>
      {/if}
    </section>
  {/if}
</div>
