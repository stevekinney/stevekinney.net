import type { PatternEntry } from './pattern-types';

export type ShortlistItem = {
  /** The entry's id. It's a slug of the name, so two libraries can share one. */
  id: string;
  note: string;
  /** Which library the entry came from. Absent means the bundled one, as in older saved lists. */
  library?: string;
};

export const bundledLibrary = 'bundled';

export const libraryOf = (item: ShortlistItem): string => item.library ?? bundledLibrary;

/** The items that belong to one library. The others are kept for when that library is open. */
export const itemsIn = (items: readonly ShortlistItem[], library: string): ShortlistItem[] =>
  items.filter((item) => libraryOf(item) === library);

export const shortlistStorageKey = 'agentic-coding-patterns:shortlist';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isShortlistItem = (value: unknown): value is ShortlistItem =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ShortlistItem).id === 'string' &&
  typeof (value as ShortlistItem).note === 'string' &&
  ['string', 'undefined'].includes(typeof (value as ShortlistItem).library);

/** The browser's storage, or `null` where it's blocked, such as in some private windows. */
const browserStorage = (): StorageLike | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

/**
 * Reads the saved shortlist. Storage is a convenience, so a missing,
 * blocked, or corrupt store gives an empty shortlist instead of an error.
 */
export const readShortlist = (storage: StorageLike | null = browserStorage()): ShortlistItem[] => {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(shortlistStorageKey) ?? '[]');

    return Array.isArray(parsed) ? parsed.filter(isShortlistItem) : [];
  } catch {
    return [];
  }
};

/** Saves the shortlist, quietly doing nothing where storage isn't available. */
export const writeShortlist = (
  items: readonly ShortlistItem[],
  storage: StorageLike | null = browserStorage(),
): void => {
  try {
    storage?.setItem(shortlistStorageKey, JSON.stringify(items));
  } catch {
    // The shortlist still works for this visit.
  }
};

const isEntry = (item: ShortlistItem, id: string, library: string): boolean =>
  item.id === id && libraryOf(item) === library;

export const isStarred = (
  items: readonly ShortlistItem[],
  id: string,
  library = bundledLibrary,
): boolean => items.some((item) => isEntry(item, id, library));

/** Adds an entry to the shortlist, or removes it when it's already there. */
export const toggleStar = (
  items: readonly ShortlistItem[],
  id: string,
  library = bundledLibrary,
): ShortlistItem[] =>
  isStarred(items, id, library)
    ? items.filter((item) => !isEntry(item, id, library))
    : [...items, library === bundledLibrary ? { id, note: '' } : { id, note: '', library }];

export const setNote = (
  items: readonly ShortlistItem[],
  id: string,
  note: string,
  library = bundledLibrary,
): ShortlistItem[] => items.map((item) => (isEntry(item, id, library) ? { ...item, note } : item));

export type ShortlistRow = {
  entry: PatternEntry;
  note: string;
};

const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * A note for the vault: a `## Contents` heading and a bullet for each entry,
 * written as a wikilink followed by the person's note, the way the library's
 * own notes link to each other.
 */
export const shortlistToMarkdown = (rows: readonly ShortlistRow[]): string => {
  const bullets = rows.map(({ entry, note }) => {
    const text = oneLine(note);

    return `- [[${entry.name}]]${text === '' ? '' : `—${text}`}`;
  });

  return ['# Pattern shortlist', '', '## Contents', '', ...bullets, ''].join('\n');
};

const formulaStart = /^[=+\-@\t\r]/;

const csvCell = (value: string): string => {
  // A spreadsheet runs a cell that starts with one of these as a formula.
  const safe = formulaStart.test(value) ? `'${value}` : value;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** The shortlist as CSV with the columns name, category, maturity, confidence, and note. */
export const shortlistToCsv = (rows: readonly ShortlistRow[]): string =>
  [
    ['name', 'category', 'maturity', 'confidence', 'note'],
    ...rows.map(({ entry, note }) => [
      entry.name,
      entry.category,
      entry.maturity,
      entry.confidence,
      oneLine(note),
    ]),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
    .concat('\r\n');

/** Saves text as a file by clicking a temporary link to an object URL. */
export const downloadText = (filename: string, text: string, type: string): void => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
