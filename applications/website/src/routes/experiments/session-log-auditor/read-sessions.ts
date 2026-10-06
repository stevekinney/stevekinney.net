/**
 * Streams session files through an adapter in the browser, line by line, with
 * progress and cancellation. Nothing is sent anywhere.
 */
import type { SourceFile } from '$lib/experiments/dropped-files';
import { readLines } from '$lib/experiments/read-lines';

import { claudeCodeAdapter } from './audit-data';
import type { AuditData, SessionLogAdapter } from './audit-data';

export type ReadProgress = {
  /** One-based index of the file being read. */
  file: number;
  files: number;
  /** Characters read so far, which is close to bytes for transcripts. */
  read: number;
  /** Bytes in every file. */
  total: number;
};

export type ReadOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: ReadProgress) => void;
  adapter?: SessionLogAdapter;
  /** How often to report progress while a file is read. */
  progressMilliseconds?: number;
};

/** Only these are read from a dropped or picked folder. Files chosen one by one are always read. */
export const isSessionFile = (path: string): boolean => path.toLowerCase().endsWith('.jsonl');

export const abortError = (): DOMException =>
  new DOMException('Reading was cancelled.', 'AbortError');

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

export const readSessionFiles = async (
  files: readonly SourceFile[],
  { signal, onProgress, adapter = claudeCodeAdapter, progressMilliseconds = 100 }: ReadOptions = {},
): Promise<AuditData> => {
  const reader = adapter.createReader();
  const total = files.reduce((sum, { file }) => sum + file.size, 0);
  let read = 0;
  let reported = 0;

  for (const [index, { file, path }] of files.entries()) {
    if (signal?.aborted) throw abortError();

    const progress = (): void =>
      onProgress?.({ file: index + 1, files: files.length, read, total });
    progress();

    const fileReader = reader.readFile(path);
    await readLines(file.stream(), (line) => {
      if (signal?.aborted) throw abortError();

      fileReader.addLine(line);
      read += line.length + 1;

      const now = performance.now();
      if (now - reported >= progressMilliseconds) {
        reported = now;
        progress();
      }
    });
    fileReader.finish();
  }

  if (signal?.aborted) throw abortError();
  onProgress?.({ file: files.length, files: files.length, read: total, total });

  return reader.finish();
};
