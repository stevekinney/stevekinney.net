import { parseTokenCount } from '$lib/experiments/format';

import type { Scenario, TermKey } from './budget';

/** One category from the readout. */
export type ReadoutRow = {
  /** The label as printed, without `(deferred)`. */
  label: string;
  /** The label lowercased and tidied, which is how the page decides which term it belongs to. */
  key: string;
  tokens: number;
  /** A deferred row is reported but is not in the window, so nothing counts it. */
  deferred: boolean;
};

export type ParsedReadout = {
  /** The window's size from the header's used/total pair, or null when there is no header. */
  capacity: number | null;
  rows: ReadoutRow[];
  /** The `Free space` row, which the page quotes next to its own figure. */
  freeSpace: number | null;
  /** Which of the two printed forms this was. */
  form: 'table' | 'lines' | 'none';
};

/** Which term each label from the readout belongs to. */
const labelTerms: Record<string, TermKey> = {
  'system prompt': 'instructions',
  'memory files': 'instructions',
  skills: 'instructions',
  'custom agents': 'instructions',
  'system tools': 'tools',
  'mcp tools': 'tools',
  messages: 'history',
  'autocompact buffer': 'margin',
};

/** Lowercases a label and strips the markup, glyphs, and the deferred marker around it. */
export const normalizeLabel = (label: string): string =>
  label
    .toLowerCase()
    .replace(/\(\s*deferred\s*\)/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

const isDeferred = (label: string): boolean => /\bdeferred\b/i.test(label);

const tidyLabel = (label: string): string =>
  label
    .replace(/\(\s*deferred\s*\)/gi, '')
    .replace(/[*_`]/g, '')
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Reads `2.3k`, `985`, `~40`, or `1.2M` from a cell or a row. Returns null for anything else. */
const readAmount = (text: string): number | null => {
  const cleaned = text.trim().replace(/^~/, '');

  return /^\d/.test(cleaned) ? parseTokenCount(cleaned) : null;
};

const buildRow = (label: string, tokens: number): ReadoutRow => ({
  label: tidyLabel(label),
  key: normalizeLabel(label),
  tokens,
  deferred: isDeferred(label),
});

// The header's used/total pair, such as `120k/1000k tokens (12%)` from the
// interactive view or `35.5k / 1m (4%)` from print mode.
const headerPair =
  /(?<![\d./\w])(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?\s*\/\s*(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?(?![\d/\w])/;

const readCapacity = (lines: string[]): number | null => {
  for (const line of lines) {
    const match = headerPair.exec(line);
    if (!match) continue;

    const total = parseTokenCount(`${match[3]}${match[4] ?? ''}`);
    if (total !== null && total >= 1000) return total;
  }

  return null;
};

const splitCells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isSeparator = (cells: string[]): boolean => cells.every((cell) => /^:?-{2,}:?$/.test(cell));

/**
 * Reads the first Markdown table headed `Category` and `Tokens`. Later tables
 * in the same output, such as the one listing custom agents, break down rows
 * this one already counts, so they are never read.
 */
const readTable = (lines: string[]): { rows: ReadoutRow[]; found: boolean } => {
  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start].trim().startsWith('|')) continue;

    let end = start;
    while (end < lines.length && lines[end].trim().startsWith('|')) end += 1;

    const block = lines.slice(start, end).map(splitCells);
    start = end - 1;

    const header = block[0]?.map((cell) => cell.toLowerCase().replace(/[*_`]/g, '')) ?? [];
    const tokenColumn = header.indexOf('tokens');
    if (!['category', 'label', 'name'].includes(header[0] ?? '') || tokenColumn === -1) continue;

    const rows: ReadoutRow[] = [];
    for (const cells of block.slice(1)) {
      if (isSeparator(cells)) continue;

      const tokens = readAmount(cells[tokenColumn] ?? '');
      if (tokens !== null && cells[0]) rows.push(buildRow(cells[0], tokens));
    }

    return { rows, found: true };
  }

  return { rows: [], found: false };
};

// `⛁ System prompt: 2.3k tokens (0.2%)`. The percentage and the word `tokens` are optional.
const labelledRow =
  /^(?<label>[^:|]+?)\s*:\s*~?(?<amount>\d[\d,]*(?:\.\d+)?\s*[kKmM]?)(?:\s*tokens?)?(?:\s*\(\s*\d+(?:\.\d+)?\s*%\s*\))?\s*$/;

const readLineRows = (lines: string[]): ReadoutRow[] => {
  const rows: ReadoutRow[] = [];

  for (const raw of lines) {
    // Lines under a category, such as `└ CLAUDE.md: 1.2k tokens`, break down a row that is already counted.
    if (/^\s*[└├│]/.test(raw)) continue;

    const line = raw
      .replace(/[*_`]/g, '')
      .replace(/^[^\p{L}\p{N}]+/u, '')
      .trim();
    const match = labelledRow.exec(line);
    if (!match?.groups) continue;

    const tokens = readAmount(match.groups.amount);
    if (tokens !== null) rows.push(buildRow(match.groups.label, tokens));
  }

  return rows;
};

/**
 * Folds rows that share a label into one, adding their tokens, because the
 * page would count each of them. The key also identifies a row in the
 * interface, so it has to be unique there. A deferred row never merges with a
 * resident one, since they are counted differently.
 */
const mergeRepeatedRows = (rows: ReadoutRow[]): ReadoutRow[] => {
  const merged = new Map<string, ReadoutRow>();

  for (const row of rows) {
    const identity = `${row.deferred ? 'deferred' : 'resident'}:${row.key}`;
    const existing = merged.get(identity);

    if (existing) existing.tokens += row.tokens;
    else merged.set(identity, { ...row });
  }

  return [...merged.values()];
};

/**
 * Reads what Claude Code's `/context` prints, in either form: the interactive
 * view's `<label>: <number>k tokens (<pct>%)` lines under a `120k/1000k tokens`
 * header, or print mode's Markdown tables.
 */
export const parseReadout = (text: string): ParsedReadout => {
  const lines = text.split(/\r?\n/);
  const capacity = readCapacity(lines);
  const table = readTable(lines);
  const all = mergeRepeatedRows(table.found ? table.rows : readLineRows(lines));

  const freeRow = all.find((row) => row.key === 'free space');
  const rows = all.filter((row) => row.key !== 'free space');

  return {
    capacity,
    rows,
    freeSpace: freeRow?.tokens ?? null,
    form: table.found ? 'table' : rows.length > 0 || freeRow ? 'lines' : 'none',
  };
};

export type AppliedReadout = {
  /** The window's size from the header, or null when the paste has no header. */
  capacity: number | null;
  /** Only terms with at least one counted row appear here. */
  values: Partial<Record<TermKey, number>>;
  deferred: ReadoutRow[];
  /** Rows with a label the page doesn't know. They are listed, not counted. */
  unrecognized: ReadoutRow[];
};

/**
 * Sorts a readout's rows into the terms. A row marked deferred is shown and
 * counted nowhere: it is reported but not resident, so adding it would
 * double-count against the free space the readout itself reports.
 */
export const applyReadout = (parsed: ParsedReadout): AppliedReadout => {
  const values: Partial<Record<TermKey, number>> = {};
  const deferred: ReadoutRow[] = [];
  const unrecognized: ReadoutRow[] = [];

  for (const row of parsed.rows) {
    if (row.deferred) {
      deferred.push(row);
      continue;
    }

    // Own properties only: a label such as `constructor` must not find an inherited value.
    const term = Object.hasOwn(labelTerms, row.key) ? labelTerms[row.key] : undefined;
    if (term === undefined) unrecognized.push(row);
    else values[term] = (values[term] ?? 0) + row.tokens;
  }

  return { capacity: parsed.capacity, values, deferred, unrecognized };
};

/**
 * `/context` doesn't report room held back for the reply, so the page assumes
 * the same 32K the presets use. That keeps "Yours" comparable with them.
 */
export const assumedReservedOutput = 32_000;

/** The pasted readout as a scenario, or null when there's no header to say how big the window is. */
export const scenarioFromReadout = (applied: AppliedReadout): Scenario | null =>
  applied.capacity === null
    ? null
    : {
        capacity: applied.capacity,
        instructions: applied.values.instructions ?? 0,
        tools: applied.values.tools ?? 0,
        history: applied.values.history ?? 0,
        generation: assumedReservedOutput,
        margin: applied.values.margin ?? 0,
      };
