import { readLines } from '$lib/experiments/read-lines';

/** Instructions files and decks are small. Anything bigger than this isn't one. */
export const MAXIMUM_FILE_BYTES = 2_000_000;

export type ReadResult = { ok: true; text: string } | { ok: false; reason: string };

/**
 * Reads a dropped or picked text file in the browser, streaming it so the page
 * stays responsive, and refusing anything too large to be an instructions file.
 */
export const readTextFile = async (
  file: File,
  maximumBytes = MAXIMUM_FILE_BYTES,
): Promise<ReadResult> => {
  if (file.size > maximumBytes) {
    return {
      ok: false,
      reason: `${file.name} is too large to be an instructions file, so it wasn’t read.`,
    };
  }

  const lines: string[] = [];
  try {
    await readLines(file.stream(), (line) => lines.push(line));
  } catch {
    return { ok: false, reason: `Couldn’t read ${file.name}.` };
  }

  const text = lines.join('\n');
  if (text.includes('\u0000')) {
    return { ok: false, reason: `${file.name} doesn’t look like a text file.` };
  }

  return { ok: true, text };
};
