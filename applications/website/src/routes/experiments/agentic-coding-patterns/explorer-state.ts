import {
  knownCategories,
  knownConfidences,
  knownMaturities,
  uncategorized,
} from './pattern-constants';
import type { PatternEntry } from './pattern-types';

export type ExplorerView = 'list' | 'graph' | 'compare' | 'shortlist';
export type GridDimension = 'maturity' | 'confidence';

export type Filters = {
  category: string | null;
  maturity: string | null;
  confidence: string | null;
  type: string | null;
  partialOnly: boolean;
};

/**
 * Everything the explorer shows is a function of this one object, and the
 * address bar holds all of it, so a link reproduces the view.
 */
export type ExplorerState = {
  view: ExplorerView;
  query: string;
  filters: Filters;
  /** Which labels the heat grid uses for its columns. */
  gridBy: GridDimension;
  /** The open entry's id, or `null` to show the view itself. */
  selected: string | null;
  /** Up to three entry ids to compare. */
  compare: string[];
};

export const maximumCompared = 3;

export const emptyFilters: Filters = {
  category: null,
  maturity: null,
  confidence: null,
  type: null,
  partialOnly: false,
};

export const initialState: ExplorerState = {
  view: 'list',
  query: '',
  filters: emptyFilters,
  gridBy: 'maturity',
  selected: null,
  compare: [],
};

const views: readonly ExplorerView[] = ['list', 'graph', 'compare', 'shortlist'];

const clean = (value: string | null): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

/** Reads the view from a page's query string and fragment. */
export const parseUrlState = (search: string, hash: string): ExplorerState => {
  const parameters = new URLSearchParams(search);
  const view = parameters.get('view');
  const fragment = hash.replace(/^#/, '');
  const decodeFragment = (): string => {
    try {
      return decodeURIComponent(fragment);
    } catch {
      return fragment;
    }
  };
  const selected = clean(decodeFragment());

  return {
    view: views.find((candidate) => candidate === view) ?? 'list',
    query: parameters.get('q') ?? '',
    filters: {
      category: clean(parameters.get('category'))?.toLowerCase() ?? null,
      maturity: clean(parameters.get('maturity'))?.toLowerCase() ?? null,
      confidence: clean(parameters.get('confidence')),
      type: clean(parameters.get('type'))?.toLowerCase() ?? null,
      partialOnly: parameters.get('partial') === '1',
    },
    gridBy: parameters.get('grid') === 'confidence' ? 'confidence' : 'maturity',
    selected,
    compare: [
      ...new Set(
        (parameters.get('compare') ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id !== ''),
      ),
    ].slice(0, maximumCompared),
  };
};

/** Writes the state as a query string (with its `?`, or empty) and a fragment (with its `#`, or empty). */
export const serializeUrlState = (state: ExplorerState): { search: string; hash: string } => {
  const parameters = new URLSearchParams();

  if (state.query !== '') parameters.set('q', state.query);
  if (state.filters.category) parameters.set('category', state.filters.category);
  if (state.filters.maturity) parameters.set('maturity', state.filters.maturity);
  if (state.filters.confidence) parameters.set('confidence', state.filters.confidence);
  if (state.filters.type) parameters.set('type', state.filters.type);
  if (state.filters.partialOnly) parameters.set('partial', '1');
  if (state.gridBy !== 'maturity') parameters.set('grid', state.gridBy);
  if (state.view !== 'list') parameters.set('view', state.view);
  if (state.compare.length > 0) parameters.set('compare', state.compare.join(','));

  const search = parameters.toString();

  return {
    search: search === '' ? '' : `?${search}`,
    hash: state.selected ? `#${encodeURIComponent(state.selected)}` : '',
  };
};

export const hasActiveFilters = ({ filters, query }: ExplorerState): boolean =>
  query.trim() !== '' ||
  filters.category !== null ||
  filters.maturity !== null ||
  filters.confidence !== null ||
  filters.type !== null ||
  filters.partialOnly;

export const isPartial = (entry: PatternEntry): boolean => entry.missing.length > 0;

/** The bucket a maturity or confidence value falls in: itself when known, otherwise `other`. */
export const labelBucket = (dimension: GridDimension, value: string): string => {
  const known: readonly string[] = dimension === 'maturity' ? knownMaturities : knownConfidences;

  return known.includes(value) ? value : 'other';
};

/** Applies every filter but the search. Filters combine with AND. */
export const filterEntries = (entries: readonly PatternEntry[], filters: Filters): PatternEntry[] =>
  entries.filter(
    (entry) =>
      (filters.category === null || entry.category === filters.category) &&
      (filters.maturity === null || labelBucket('maturity', entry.maturity) === filters.maturity) &&
      (filters.confidence === null ||
        labelBucket('confidence', entry.confidence) === filters.confidence) &&
      (filters.type === null || entry.type === filters.type) &&
      (!filters.partialOnly || isPartial(entry)),
  );

export type GridColumn = { key: string; label: string };

export type GridRow = {
  category: string;
  cells: number[];
  total: number;
};

export type GridData = {
  columns: GridColumn[];
  rows: GridRow[];
  columnTotals: number[];
  total: number;
  /** The largest cell, which the shading scales to. */
  maximum: number;
};

/**
 * Counts entries by category and by maturity or confidence. Known categories
 * come first in the library's own order and any others follow, so nothing a
 * folder holds is hidden. Values outside the known labels share one `other`
 * column, which only exists when something falls in it.
 */
export const buildGrid = (entries: readonly PatternEntry[], dimension: GridDimension): GridData => {
  const known: readonly string[] = dimension === 'maturity' ? knownMaturities : knownConfidences;
  const columns: GridColumn[] = known.map((key) => ({ key, label: key }));
  const hasOther = entries.some((entry) => labelBucket(dimension, entry[dimension]) === 'other');
  if (hasOther) columns.push({ key: 'other', label: 'other' });

  const categories = [...new Set(entries.map((entry) => entry.category))];
  const ordered = [
    ...knownCategories.filter((category) => categories.includes(category)),
    ...categories
      .filter((category) => !(knownCategories as readonly string[]).includes(category))
      .sort((first, second) => {
        // A missing category goes last of all.
        if (first === uncategorized) return 1;
        if (second === uncategorized) return -1;

        return first.localeCompare(second);
      }),
  ];

  const rows = ordered.map((category): GridRow => {
    const cells = columns.map(
      ({ key }) =>
        entries.filter(
          (entry) =>
            entry.category === category && labelBucket(dimension, entry[dimension]) === key,
        ).length,
    );

    return { category, cells, total: cells.reduce((sum, count) => sum + count, 0) };
  });

  return {
    columns,
    rows,
    columnTotals: columns.map((_, index) =>
      rows.reduce((sum, row) => sum + (row.cells[index] ?? 0), 0),
    ),
    total: entries.length,
    maximum: Math.max(0, ...rows.flatMap((row) => row.cells)),
  };
};

/** Five steps of shading, scaled to the largest cell. A zero has none. */
export const heatLevel = (count: number, maximum: number): 0 | 1 | 2 | 3 | 4 | 5 => {
  if (count <= 0 || maximum <= 0) return 0;

  return Math.min(5, Math.max(1, Math.ceil((count / maximum) * 5))) as 1 | 2 | 3 | 4 | 5;
};

/**
 * Applies a click on the heat grid. A cell filters by its category and its
 * label, a row total by the category alone, and a column total by the label
 * alone. Clicking what's already active clears it.
 */
export const applyGridSelection = (
  state: ExplorerState,
  selection: { category: string | null; label: string | null },
): ExplorerState => {
  const { gridBy, filters } = state;
  const active = filters.category === selection.category && filters[gridBy] === selection.label;

  return {
    ...state,
    selected: null,
    filters: {
      ...filters,
      category: active ? null : selection.category,
      [gridBy]: active ? null : selection.label,
    },
  };
};

// A query that already has quotes, such as a phrase, reads fine as typed.
const describeQuery = (query: string): string | null => {
  const trimmed = query.trim();

  if (trimmed === '') return null;

  return trimmed.includes('"') ? trimmed : `“${trimmed}”`;
};

/** The pieces of the live count, such as `verification` and `established`, in a fixed order. */
export const describeFilters = ({ filters, query }: ExplorerState): string[] =>
  [
    filters.category,
    filters.maturity,
    filters.confidence,
    filters.type,
    filters.partialOnly ? 'partial only' : null,
    describeQuery(query),
  ].filter((part): part is string => part !== null);
