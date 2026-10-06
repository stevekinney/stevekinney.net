/**
 * Turns uploaded or pasted text into one shape: a header row and string cells.
 * Everything after this, from the column mapping to the statistics, reads only
 * that shape, so a CSV, a JSON file, a paste, and the typed-in grid all land
 * in the same place.
 */

export type RawTable = {
  columns: string[];
  rows: string[][];
};

/** Set only when rows past `MAX_ROWS` were left out. */
export type ParsedTable =
  { ok: true; table: RawTable; truncated?: true } | { ok: false; error: string };

/**
 * The most rows read from one source. Every row is kept in memory as strings
 * and fed to the statistics, so a file past this is read only up to it, and
 * the page says so with `ROW_LIMIT_NOTE`.
 */
export const MAX_ROWS = 100_000;

export const ROW_LIMIT_NOTE = `Read the first ${MAX_ROWS.toLocaleString('en-US')} rows only.`;

/** A table reader fed one line at a time. `push` returns false once it wants no more lines. */
export type LineReader = {
  push: (line: string) => boolean;
  finish: () => ParsedTable;
};

type Delimiter = ',' | '\t' | ';';

/** Picks the delimiter that appears most in the header, outside quotes. Commas win ties. */
export const detectDelimiter = (header: string): Delimiter => {
  const counts: Record<Delimiter, number> = { ',': 0, '\t': 0, ';': 0 };
  let quoted = false;

  for (const character of header) {
    if (character === '"') quoted = !quoted;
    else if (!quoted && character in counts) counts[character as Delimiter] += 1;
  }

  if (counts['\t'] > counts[','] && counts['\t'] >= counts[';']) return '\t';
  if (counts[';'] > counts[',']) return ';';

  return ',';
};

/** Splits one CSV record into cells, honoring quotes and doubled quotes inside them. */
export const splitRecord = (record: string, delimiter: Delimiter): string[] => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (quoted) {
      if (character === '"') {
        if (record[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.trim() === '') {
      cell = '';
      quoted = true;
    } else if (character === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());

  return cells;
};

type QuoteState = { quoted: boolean; cellBlank: boolean };

/**
 * Carries the quote state across one line, with the rule `splitRecord` uses: a
 * quote opens a cell only when nothing but spaces comes before it in that
 * cell. A stray quote inside a cell, such as `5" monitor`, is just a character,
 * so it doesn't swallow every line after it.
 */
const scanQuotes = (line: string, start: QuoteState, delimiter: Delimiter): QuoteState => {
  let { quoted, cellBlank } = start;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          cellBlank = false;
          index += 1;
        } else {
          quoted = false;
        }
      } else if (character.trim() !== '') {
        cellBlank = false;
      }
    } else if (character === '"' && cellBlank) {
      quoted = true;
    } else if (character === delimiter) {
      cellBlank = true;
    } else if (character.trim() !== '') {
      cellBlank = false;
    }
  }

  return { quoted, cellBlank };
};

/**
 * Reads CSV one line at a time, so a large file can be streamed with
 * `readLines`. A quoted cell with a line break in it spans lines, and the
 * reader joins them back together.
 */
export const createCsvReader = (): LineReader => {
  let delimiter: Delimiter = ',';
  let columns: string[] | null = null;
  const rows: string[][] = [];
  /** The lines of a record whose quoted cell hasn't closed yet. */
  let pending: string[] | null = null;
  let pendingDelimiter: Delimiter = ',';
  let state: QuoteState = { quoted: false, cellBlank: true };
  let truncated = false;

  const take = (record: string): void => {
    if (columns === null) {
      if (record.trim() === '') return;

      delimiter = detectDelimiter(record);
      columns = splitRecord(record.replace(/^\uFEFF/, ''), delimiter);

      return;
    }

    if (record.trim() === '') return;
    if (rows.length >= MAX_ROWS) {
      truncated = true;

      return;
    }
    rows.push(splitRecord(record, delimiter));
  };

  return {
    push: (line) => {
      if (truncated) return false;
      const text = line.endsWith('\r') ? line.slice(0, -1) : line;

      if (pending === null) {
        // The header's delimiter isn't known until its line is read.
        pendingDelimiter = columns === null ? detectDelimiter(text) : delimiter;
        state = { quoted: false, cellBlank: true };
      }

      state = scanQuotes(pending === null ? text : `\n${text}`, state, pendingDelimiter);
      if (state.quoted) {
        (pending ??= []).push(text);

        return true;
      }

      const record = pending === null ? text : [...pending, text].join('\n');
      pending = null;
      take(record);

      return !truncated;
    },
    finish: () => {
      if (pending !== null) {
        // A quote that never closed. Read its lines one at a time, so one bad
        // cell costs one row, which is reported, instead of the rest of the file.
        for (const text of pending) take(text);
        pending = null;
      }

      if (columns === null || columns.every((column) => column === '')) {
        return {
          ok: false,
          error: 'There’s no header row. The first line should name the columns.',
        };
      }

      return truncated
        ? { ok: true, table: { columns, rows }, truncated }
        : { ok: true, table: { columns, rows } };
    },
  };
};

export const parseCsv = (text: string): ParsedTable => {
  const reader = createCsvReader();
  for (const line of text.split('\n')) if (!reader.push(line)) break;

  return reader.finish();
};

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Builds a table from objects, with a column for every key in the order keys
 * first appear. Only the first `MAX_ROWS` items are read.
 */
export const tableFromObjects = (all: readonly unknown[]): ParsedTable => {
  const truncated = all.length > MAX_ROWS;
  const items = truncated ? all.slice(0, MAX_ROWS) : all;
  const columns: string[] = [];
  const positions = new Map<string, number>();

  for (const item of items) {
    if (!isRecord(item)) continue;
    for (const key of Object.keys(item)) {
      if (!positions.has(key)) {
        positions.set(key, columns.length);
        columns.push(key);
      }
    }
  }

  if (columns.length === 0) {
    return { ok: false, error: 'There are no rows with named fields in it.' };
  }

  const rows = items.map((item) =>
    columns.map((column) =>
      isRecord(item) && Object.hasOwn(item, column) ? cellText(item[column]) : '',
    ),
  );

  return truncated
    ? { ok: true, table: { columns, rows }, truncated }
    : { ok: true, table: { columns, rows } };
};

/**
 * Reads JSON: an array of objects, or an object holding one under a key such
 * as `rows`, `tasks`, or `data`.
 */
export const parseJson = (text: string): ParsedTable => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That isn’t valid JSON.' };
  }

  if (Array.isArray(parsed)) return tableFromObjects(parsed);

  if (isRecord(parsed)) {
    const list = Object.values(parsed).find(Array.isArray);
    if (list) return tableFromObjects(list);
  }

  return {
    ok: false,
    error: 'The JSON should be a list of rows, such as [{"condition": "A", …}].',
  };
};

/** Reads JSON Lines one line at a time. Lines that aren't JSON objects are left out. */
export const createJsonLinesReader = (): LineReader => {
  const items: unknown[] = [];
  let truncated = false;

  return {
    push: (line) => {
      if (truncated) return false;
      const trimmed = line.trim();
      if (trimmed === '') return true;

      if (items.length >= MAX_ROWS) {
        truncated = true;

        return false;
      }

      try {
        items.push(JSON.parse(trimmed));
      } catch {
        items.push(null);
      }

      return true;
    },
    finish: () => {
      const result = tableFromObjects(items);

      return result.ok && truncated ? { ...result, truncated } : result;
    },
  };
};

/** Pasted text could be CSV or JSON. Text that opens with a bracket or brace is read as JSON. */
export const parsePasted = (text: string): ParsedTable => {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false, error: 'Paste some rows to get started.' };

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const json = parseJson(trimmed);
    if (json.ok) return json;

    // One object per line is JSON Lines.
    const reader = createJsonLinesReader();
    for (const line of trimmed.split('\n')) if (!reader.push(line)) break;
    const lines = reader.finish();

    return lines.ok ? lines : json;
  }

  return parseCsv(trimmed);
};
