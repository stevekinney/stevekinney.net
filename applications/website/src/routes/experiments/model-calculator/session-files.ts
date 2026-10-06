import type { SourceFile } from '$lib/experiments/dropped-files';
import { readLines } from '$lib/experiments/read-lines';

import { createSessionUsageCollector } from './session-usage';
import type { SessionUsage } from './session-usage';

/** Inside a dropped folder, only session transcripts count. */
export const isSessionFile = (path: string): boolean => path.toLowerCase().endsWith('.jsonl');

/**
 * Streams every file through one collector, so usage that appears in more than
 * one file is counted once. Nothing leaves the browser.
 */
export const readSessionFiles = async (
  files: readonly SourceFile[],
  onFileStart?: (index: number) => void,
): Promise<SessionUsage> => {
  const collector = createSessionUsageCollector();

  for (const [index, { file, path }] of files.entries()) {
    onFileStart?.(index);

    const reader = collector.readFile(path);
    await readLines(file.stream(), reader.addLine);
    reader.finish();
  }

  return collector.summarize();
};
