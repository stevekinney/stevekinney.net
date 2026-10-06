<script lang="ts">
  import type { SourceFile } from '$lib/experiments/dropped-files';
  import FileDropZone from '$lib/experiments/file-drop-zone.svelte';

  import { isSessionFile } from './session-files';

  type Props = {
    /** The file being read and how many there are, while reading. */
    progress: { current: number; total: number } | null;
    /** True from the drop until reading finishes, including while a dropped folder is being walked. */
    busy: boolean;
    /** What happened with the last files read, announced once reading finishes. */
    message: string | null;
    onFiles: (files: Promise<SourceFile[]>) => void;
  };

  const { progress, busy, message, onFiles }: Props = $props();
</script>

<FileDropZone
  title="Drop Claude Code or Codex session files here"
  class="h-full"
  draggingTitle="Drop to read the session"
  accept=".jsonl"
  keepFile={isSessionFile}
  captureWindowDrops
  {busy}
  progress={progress
    ? `Reading file ${progress.current} of ${progress.total}…`
    : busy
      ? 'Collecting files…'
      : null}
  status={message}
  {onFiles}
>
  <ul class="space-y-1">
    <li>
      <span class="font-semibold text-slate-600 dark:text-slate-300">Claude Code:</span>
      <code>~/.claude/<wbr />projects/<wbr />&lt;project&gt;/<wbr />&lt;session&gt;.jsonl</code>.
      Subagents live in the folder with the same name, so drop both to include them.
    </li>
    <li>
      <span class="font-semibold text-slate-600 dark:text-slate-300">Codex:</span>
      <code
        >~/.codex/<wbr />sessions/<wbr />&lt;year&gt;/<wbr />&lt;month&gt;/<wbr />&lt;day&gt;/</code
      >.
    </li>
    <li>Both folders are hidden. In the macOS file picker, press ⌘⇧. to show them.</li>
    <li>
      On Windows, <code>~</code> is your user folder. Paste
      <code>%USERPROFILE%\<wbr />.claude\<wbr />projects</code> or
      <code>%USERPROFILE%\<wbr />.codex\<wbr />sessions</code> into the file picker's address bar.
    </li>
  </ul>
</FileDropZone>
