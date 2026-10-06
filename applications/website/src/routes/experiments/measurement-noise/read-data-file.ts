import { readLines } from '$lib/experiments/read-lines';

import { createCsvReader, createJsonLinesReader, parseJson } from './parse-table';
import type { ParsedTable } from './parse-table';

/** A JSON file has to be read whole to parse it. Past this size, ask for CSV or JSON Lines instead. */
export const MAX_JSON_BYTES = 50 * 1024 * 1024;

type Format = 'csv' | 'json' | 'jsonl';

/** Picks a format from the file name, falling back to CSV. */
export const formatOf = (name: string): Format => {
  const extension = name.toLowerCase().split('.').at(-1) ?? '';
  if (extension === 'json') return 'json';
  if (extension === 'jsonl' || extension === 'ndjson') return 'jsonl';

  return 'csv';
};

/**
 * Reads a CSV, JSON, or JSON Lines file into a table. CSV and JSON Lines are
 * streamed a line at a time, so a large file never sits in memory as one
 * string and the page keeps responding. Reading stops after `MAX_ROWS` rows.
 * `onLines` reports progress.
 */
export const readDataFile = async (
  file: File,
  onLines?: (count: number) => void,
): Promise<ParsedTable> => {
  const format = formatOf(file.name);

  if (format === 'json') {
    if (file.size > MAX_JSON_BYTES) {
      return {
        ok: false,
        error:
          'That JSON file is too big to read in one piece. Save it as CSV or JSON Lines instead.',
      };
    }

    return parseJson(await file.text());
  }

  const reader = format === 'jsonl' ? createJsonLinesReader() : createCsvReader();
  // Past `MAX_ROWS`, the reader wants no more lines, so the rest of the file is never read.
  const stop = new AbortController();
  let count = 0;

  await readLines(
    file.stream(),
    (line) => {
      if (!reader.push(line)) stop.abort();
      count += 1;
      if (count % 5_000 === 0) onLines?.(count);
    },
    { signal: stop.signal },
  );

  return reader.finish();
};
