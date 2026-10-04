import { parseTokenCount } from '$lib/experiments/format';

import { termKeys } from './budget';
import type { TermKey } from './budget';

/** One category from the readout. */
export type ReadoutRow = {
  /** The label as printed, without `(deferred)`. */
  label: string;
  /** The label lowercased and tidied, which is how the mapping table finds it. */
  key: string;
  tokens: number;
  /** A deferred row is reported but is not in the window, so nothing counts it. */
  deferred: boolean;
};

export type ParsedReadout = {
  /** The window's size from the header's used/total pair, or null when there is no header. */
  capacity: number | null;
  rows: ReadoutRow[];
  /** The `Free space` row, used only to check the other rows against. */
  freeSpace: number | null;
  /** Which of the two printed forms this was. */
  form: 'table' | 'lines' | 'none';
};

/** Where a label goes. `free` marks the free-space row, which is only used to reconcile. */
export type Destination = TermKey | 'ignore' | 'free';

export type LabelMapping = Record<string, Destination>;

export const destinations: readonly Destination[] = [...termKeys, 'ignore'];

export const defaultMapping: LabelMapping = {
  'system prompt': 'instructions',
  'memory files': 'instructions',
  skills: 'instructions',
  'custom agents': 'instructions',
  'system tools': 'tools',
  'mcp tools': 'tools',
  messages: 'history',
  'autocompact buffer': 'margin',
  'free space': 'free',
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
 * Reads what Claude Code's `/context` prints, in either form: the interactive
 * view's `<label>: <number>k tokens (<pct>%)` lines under a `120k/1000k tokens`
 * header, or print mode's Markdown tables.
 */
export const parseReadout = (text: string): ParsedReadout => {
  const lines = text.split(/\r?\n/);
  const capacity = readCapacity(lines);
  const table = readTable(lines);
  const all = table.found ? table.rows : readLineRows(lines);

  const freeRow = all.find((row) => row.key === 'free space');
  const rows = all.filter((row) => row.key !== 'free space');

  return {
    capacity,
    rows,
    freeSpace: freeRow?.tokens ?? null,
    form: table.found ? 'table' : rows.length > 0 || freeRow ? 'lines' : 'none',
  };
};

export type Reconciliation = {
  /** The window minus every counted row. */
  expectedFree: number;
  reportedFree: number;
  /** Expected minus reported. Positive means the rows account for less than the readout does. */
  difference: number;
  /** Beyond 1% of the window, the two disagree enough to say so. */
  mismatch: boolean;
};

export type AppliedReadout = {
  /** The window to measure against: the header's total, or the current one. */
  capacity: number;
  capacityFromHeader: boolean;
  /** Only terms with at least one counted row appear here. */
  values: Partial<Record<TermKey, number>>;
  counted: (ReadoutRow & { term: TermKey })[];
  deferred: ReadoutRow[];
  unrecognized: ReadoutRow[];
  reconciliation: Reconciliation | null;
};

/** How far apart the two free-space figures can be, as a share of the window, before the page says so. */
export const reconciliationTolerance = 0.01;

/**
 * Sorts a readout's rows into the terms. A row marked deferred is shown and
 * counted nowhere: it is reported but not resident, so adding it would
 * double-count against the free space the readout itself reports.
 */
export const applyReadout = (
  parsed: ParsedReadout,
  mapping: LabelMapping,
  currentCapacity: number,
): AppliedReadout => {
  const capacity = parsed.capacity ?? currentCapacity;
  const values: Partial<Record<TermKey, number>> = {};
  const counted: AppliedReadout['counted'] = [];
  const deferred: ReadoutRow[] = [];
  const unrecognized: ReadoutRow[] = [];

  for (const row of parsed.rows) {
    if (row.deferred) {
      deferred.push(row);
      continue;
    }

    const destination = mapping[row.key];
    if (destination === undefined) {
      unrecognized.push(row);
    } else if (destination !== 'ignore' && destination !== 'free') {
      values[destination] = (values[destination] ?? 0) + row.tokens;
      counted.push({ ...row, term: destination });
    }
  }

  let reconciliation: Reconciliation | null = null;
  if (parsed.freeSpace !== null) {
    const expectedFree = capacity - counted.reduce((total, row) => total + row.tokens, 0);
    const difference = expectedFree - parsed.freeSpace;

    reconciliation = {
      expectedFree,
      reportedFree: parsed.freeSpace,
      difference,
      mismatch: capacity > 0 && Math.abs(difference) > capacity * reconciliationTolerance,
    };
  }

  return {
    capacity,
    capacityFromHeader: parsed.capacity !== null,
    values,
    counted,
    deferred,
    unrecognized,
    reconciliation,
  };
};
