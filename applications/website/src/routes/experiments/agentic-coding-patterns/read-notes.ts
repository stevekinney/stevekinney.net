import type { SourceFile } from '$lib/experiments/dropped-files';
import { readLines } from '$lib/experiments/read-lines';

import type { ExcludedNote, NoteSource } from './pattern-types';

/** A note bigger than this is skipped. Real notes are a few kilobytes. */
export const maximumNoteBytes = 1_000_000;

/** A folder with more Markdown files than this is read only up to the limit. */
export const maximumNotes = 3000;

const markdownPath = /\.(md|markdown)$/i;

/** Whether a path inside a dropped or picked folder is worth reading. */
export const keepNotePath = (path: string): boolean => markdownPath.test(path);

/** Skips hidden folders, such as `.obsidian` and `.git`, and `node_modules`. */
export const enterNoteFolder = (path: string): boolean => {
  const name = path.split('/').at(-1) ?? '';

  return !name.startsWith('.') && name !== 'node_modules';
};

export type ReadNotesResult = {
  notes: NoteSource[];
  /** Files that couldn't be read as notes, and why. */
  skipped: ExcludedNote[];
  /** Set when the folder held more notes than the limit. */
  truncated: boolean;
};

/**
 * Reads the Markdown files from a dropped or picked folder. Each file streams
 * through `readLines` instead of `file.text()`, so a huge file can't freeze
 * the page, and a file over the size limit is skipped without being read.
 */
export const readNotes = async (
  files: readonly SourceFile[],
  onProgress?: (index: number, total: number) => void,
): Promise<ReadNotesResult> => {
  const notes: NoteSource[] = [];
  const skipped: ExcludedNote[] = [];
  const candidates: SourceFile[] = [];

  for (const source of files) {
    if (markdownPath.test(source.path)) candidates.push(source);
    else skipped.push({ path: source.path, reason: 'It isn’t a Markdown file.' });
  }

  const truncated = candidates.length > maximumNotes;

  for (const [index, { file, path }] of candidates.slice(0, maximumNotes).entries()) {
    onProgress?.(index, candidates.length);

    if (file.size > maximumNoteBytes) {
      skipped.push({ path, reason: 'It’s larger than 1 MB, which is too big to be a note.' });
      continue;
    }

    const lines: string[] = [];
    await readLines(file.stream(), (line) => lines.push(line));
    notes.push({ path, text: lines.join('\n') });
  }

  return { notes, skipped, truncated };
};

/** The folder the notes came from, when they share one, such as `Agentic Coding Patterns`. */
export const commonFolderName = (paths: readonly string[]): string | null => {
  const roots = new Set(paths.map((path) => (path.includes('/') ? path.split('/')[0] : null)));
  const [only] = roots;

  return roots.size === 1 && typeof only === 'string' && only !== '' ? only : null;
};
