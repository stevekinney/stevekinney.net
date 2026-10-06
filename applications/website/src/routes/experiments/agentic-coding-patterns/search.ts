import { toPlainText } from './markdown';
import type { PatternEntry } from './pattern-types';

/** Where a search looks, best match first. */
export const searchFields = [
  'name',
  'aliases',
  'summary',
  'whenToUse',
  'whenNotToUse',
  'drawbacks',
] as const;

export type SearchField = (typeof searchFields)[number];

export const searchFieldLabels: Record<SearchField, string> = {
  name: 'Name',
  aliases: 'Also known as',
  summary: 'Summary',
  whenToUse: 'When to use it',
  whenNotToUse: 'When not to use it',
  drawbacks: 'Drawbacks and failure modes',
};

/** A match in a name or an alias beats one in the summary, which beats the long sections. */
const fieldTier: Record<SearchField, number> = {
  name: 0,
  aliases: 1,
  summary: 2,
  whenToUse: 3,
  whenNotToUse: 3,
  drawbacks: 3,
};

export type QueryTerm = {
  text: string;
  /** Whether it was quoted, so its words must appear together, in order. */
  phrase: boolean;
};

/** Splits a query into words and "quoted phrases". Every term must match. */
export const parseQuery = (query: string): QueryTerm[] => {
  const terms: QueryTerm[] = [];

  for (const match of query.matchAll(/["“]([^"”]*)(?:["”]|$)|(\S+)/g)) {
    const phrase = match[1] !== undefined;
    const text = (phrase ? match[1] : match[2])?.replace(/\s+/g, ' ').trim() ?? '';

    if (text !== '') terms.push({ text, phrase });
  }

  return terms;
};

const escapePattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const termPattern = ({ text }: QueryTerm): RegExp =>
  new RegExp(text.split(' ').map(escapePattern).join('\\s+'), 'giu');

export type Range = readonly [start: number, end: number];

/** Where any term appears in some text, merged so overlapping matches become one range. */
export const findRanges = (text: string, terms: readonly QueryTerm[]): Range[] => {
  const ranges: [number, number][] = [];

  for (const term of terms) {
    for (const match of text.matchAll(termPattern(term))) {
      if (match[0] !== '') ranges.push([match.index, match.index + match[0].length]);
    }
  }

  ranges.sort((first, second) => first[0] - second[0] || first[1] - second[1]);

  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged.at(-1);

    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }

  return merged;
};

export type Segment = { text: string; match: boolean };

/** Cuts text into pieces that are or aren't matches, for rendering with `<mark>`. */
export const toSegments = (text: string, ranges: readonly Range[]): Segment[] => {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });

  return segments;
};

export type SearchDocument = {
  id: string;
  /** Each field as plain text: formatting removed, so a phrase isn't split by emphasis. */
  fields: Record<SearchField, string>;
};

export const buildSearchDocuments = (entries: readonly PatternEntry[]): SearchDocument[] =>
  entries.map((entry) => ({
    id: entry.id,
    fields: {
      name: entry.name,
      aliases: entry.aliases.join(', '),
      summary: toPlainText(entry.summary),
      whenToUse: toPlainText(entry.whenToUse),
      whenNotToUse: toPlainText(entry.whenNotToUse),
      drawbacks: toPlainText(entry.drawbacks),
    },
  }));

export type Snippet = {
  text: string;
  ranges: Range[];
};

export type SearchHit = {
  id: string;
  /** Lower is better: the sum of each term's best field tier. */
  score: number;
  /** The best place the query matched. */
  field: SearchField;
  /** A short excerpt of that field with the matched words marked, or `null` for a name. */
  snippet: Snippet | null;
};

/** A card in the list: an entry and, when a search is active, where it matched. */
export type ListResult = {
  entry: PatternEntry;
  hit: SearchHit | null;
};

const snippetBefore = 60;
const snippetAfter = 150;

const makeSnippet = (text: string, terms: readonly QueryTerm[]): Snippet => {
  const first = findRanges(text, terms)[0];
  if (!first) return { text: text.slice(0, snippetBefore + snippetAfter), ranges: [] };

  let start = Math.max(0, first[0] - snippetBefore);
  let end = Math.min(text.length, first[1] + snippetAfter);

  // Start and end on word boundaries, so the excerpt doesn't open or close mid-word.
  if (start > 0) {
    const space = text.indexOf(' ', start);
    start = space !== -1 && space < first[0] ? space + 1 : start;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    end = space > first[1] ? space : end;
  }

  const excerpt = `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;

  return { text: excerpt, ranges: findRanges(excerpt, terms) };
};

/**
 * Finds the documents that contain every term somewhere, ranked by where. Each
 * term counts its best field, so "circuit cap" can match a name and a
 * drawback. A tie in rank goes to the name that sorts first.
 */
export const search = (
  documents: readonly SearchDocument[],
  terms: readonly QueryTerm[],
): SearchHit[] => {
  if (terms.length === 0) return [];

  const patterns = terms.map(termPattern);
  const hits: SearchHit[] = [];

  for (const document of documents) {
    let score = 0;
    let best: SearchField | null = null;
    let matchedEveryTerm = true;

    for (const pattern of patterns) {
      const matching = searchFields.filter((field) => {
        pattern.lastIndex = 0;

        return pattern.test(document.fields[field]);
      });
      const tier = matching.reduce((lowest, field) => Math.min(lowest, fieldTier[field]), Infinity);

      if (matching.length === 0) {
        matchedEveryTerm = false;
        break;
      }

      score += tier;
      const field = matching.find((candidate) => fieldTier[candidate] === tier);
      if (field && (best === null || searchFields.indexOf(field) < searchFields.indexOf(best))) {
        best = field;
      }
    }

    if (!matchedEveryTerm || best === null) continue;

    hits.push({
      id: document.id,
      score,
      field: best,
      snippet: best === 'name' ? null : makeSnippet(document.fields[best], terms),
    });
  }

  return hits;
};
