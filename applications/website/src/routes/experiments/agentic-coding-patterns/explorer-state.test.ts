import { describe, expect, it } from 'vitest';

import {
  applyGridSelection,
  buildGrid,
  describeFilters,
  emptyFilters,
  filterEntries,
  hasActiveFilters,
  heatLevel,
  initialState,
  parseUrlState,
  serializeUrlState,
} from './explorer-state';
import type { ExplorerState } from './explorer-state';
import type { PatternEntry } from './pattern-types';

const entry = (overrides: Partial<PatternEntry>): PatternEntry => ({
  id: 'x',
  name: 'X',
  type: 'pattern',
  category: 'verification',
  maturity: 'established',
  confidence: 'Emerging',
  aliases: [],
  summary: '',
  whenToUse: '',
  whenNotToUse: '',
  drawbacks: '',
  related: [],
  sourcePath: 'X.md',
  missing: [],
  ...overrides,
});

const entries = [
  entry({ id: 'a', name: 'A' }),
  entry({ id: 'b', name: 'B', maturity: 'emerging', confidence: 'Strong' }),
  entry({ id: 'c', name: 'C', category: 'planning', type: 'methodology', missing: ['summary'] }),
  entry({ id: 'd', name: 'D', category: 'zebra', maturity: 'legacy', confidence: '' }),
  entry({ id: 'e', name: 'E', category: 'uncategorized' }),
];

describe('URL state', () => {
  it('round-trips every part of the state', () => {
    const state: ExplorerState = {
      view: 'graph',
      query: 'cap inflation "a b"',
      filters: {
        category: 'verification',
        maturity: 'established',
        confidence: 'Strong',
        type: 'pattern',
        partialOnly: true,
      },
      gridBy: 'confidence',
      selected: 'circuit-breaker',
      compare: ['a', 'b'],
    };
    const { search, hash } = serializeUrlState(state);

    expect(parseUrlState(search, hash)).toEqual(state);
  });

  it('writes nothing for the default state', () => {
    expect(serializeUrlState(initialState)).toEqual({ search: '', hash: '' });
    expect(parseUrlState('', '')).toEqual(initialState);
  });

  it('puts the open entry in the fragment and the filters in the query', () => {
    const state = parseUrlState('?category=verification&maturity=established', '#circuit-breaker');

    expect(state.selected).toBe('circuit-breaker');
    expect(state.filters).toMatchObject({ category: 'verification', maturity: 'established' });
    expect(serializeUrlState(state)).toEqual({
      search: '?category=verification&maturity=established',
      hash: '#circuit-breaker',
    });
  });

  it('ignores an unknown view, trims blanks, and caps the comparison at three', () => {
    const state = parseUrlState('?view=nonsense&category=%20&compare=a,b,b,c,d', '');

    expect(state.view).toBe('list');
    expect(state.filters.category).toBeNull();
    expect(state.compare).toEqual(['a', 'b', 'c']);
  });

  it('survives a malformed fragment', () => {
    expect(parseUrlState('', '#%E0%A4%A').selected).toBe('%E0%A4%A');
  });
});

describe('filterEntries', () => {
  it('combines filters with AND', () => {
    expect(
      filterEntries(entries, { ...emptyFilters, category: 'verification' }).map((e) => e.id),
    ).toEqual(['a', 'b']);
    expect(
      filterEntries(entries, {
        ...emptyFilters,
        category: 'verification',
        maturity: 'emerging',
      }).map((e) => e.id),
    ).toEqual(['b']);
    expect(
      filterEntries(entries, { ...emptyFilters, type: 'methodology', partialOnly: true }).map(
        (e) => e.id,
      ),
    ).toEqual(['c']);
    expect(
      filterEntries(entries, { ...emptyFilters, confidence: 'Strong', type: 'methodology' }),
    ).toEqual([]);
  });

  it('puts unknown labels in the other bucket', () => {
    expect(filterEntries(entries, { ...emptyFilters, maturity: 'other' }).map((e) => e.id)).toEqual(
      ['d'],
    );
    expect(
      filterEntries(entries, { ...emptyFilters, confidence: 'other' }).map((e) => e.id),
    ).toEqual(['d']);
  });
});

describe('buildGrid', () => {
  it('counts by category and maturity, listing known categories first and unknown ones last', () => {
    const grid = buildGrid(entries, 'maturity');

    expect(grid.columns.map(({ key }) => key)).toEqual([
      'foundational',
      'established',
      'emerging',
      'other',
    ]);
    expect(grid.rows.map(({ category }) => category)).toEqual([
      'verification',
      'planning',
      'zebra',
      'uncategorized',
    ]);
    expect(grid.rows[0]).toEqual({ category: 'verification', cells: [0, 1, 1, 0], total: 2 });
    expect(grid.columnTotals).toEqual([0, 3, 1, 1]);
    expect(grid.total).toBe(5);
    expect(grid.maximum).toBe(1);
  });

  it('has no other column when every label is known', () => {
    const grid = buildGrid([entries[0] as PatternEntry, entries[1] as PatternEntry], 'confidence');

    expect(grid.columns.map(({ key }) => key)).toEqual(['Strong', 'Emerging', 'Experimental']);
    expect(grid.rows[0]?.cells).toEqual([1, 1, 0]);
  });

  it('is empty for no entries', () => {
    expect(buildGrid([], 'maturity')).toMatchObject({ rows: [], total: 0, maximum: 0 });
  });
});

describe('heatLevel', () => {
  it('has five steps scaled to the largest cell, and none for zero', () => {
    expect([0, 1, 4, 8, 12, 16, 20].map((count) => heatLevel(count, 20))).toEqual([
      0, 1, 1, 2, 3, 4, 5,
    ]);
    expect(heatLevel(5, 5)).toBe(5);
    expect(heatLevel(3, 0)).toBe(0);
  });
});

describe('applyGridSelection', () => {
  it('filters by category and label, and clears when the same cell is chosen again', () => {
    const selected = applyGridSelection(initialState, {
      category: 'verification',
      label: 'established',
    });

    expect(selected.filters).toMatchObject({ category: 'verification', maturity: 'established' });

    const cleared = applyGridSelection(selected, {
      category: 'verification',
      label: 'established',
    });
    expect(cleared.filters).toEqual(emptyFilters);
  });

  it('filters by category alone for a row total, and by label alone for a column total', () => {
    expect(
      applyGridSelection(initialState, { category: 'planning', label: null }).filters,
    ).toMatchObject({
      category: 'planning',
      maturity: null,
    });
    expect(
      applyGridSelection(initialState, { category: null, label: 'emerging' }).filters,
    ).toMatchObject({
      category: null,
      maturity: 'emerging',
    });
  });

  it('uses confidence when the grid is showing it, and keeps the other filters', () => {
    const state = {
      ...initialState,
      gridBy: 'confidence' as const,
      filters: { ...emptyFilters, type: 'pattern' },
    };
    const next = applyGridSelection(state, { category: 'planning', label: 'Strong' });

    expect(next.filters).toMatchObject({
      category: 'planning',
      confidence: 'Strong',
      type: 'pattern',
      maturity: null,
    });
  });

  it('closes an open entry so the list shows', () => {
    expect(
      applyGridSelection({ ...initialState, selected: 'a' }, { category: 'planning', label: null })
        .selected,
    ).toBeNull();
  });
});

describe('describeFilters', () => {
  it('lists the active filters in a fixed order', () => {
    expect(
      describeFilters({
        ...initialState,
        query: ' loop ',
        filters: {
          ...emptyFilters,
          category: 'verification',
          maturity: 'established',
          partialOnly: true,
        },
      }),
    ).toEqual(['verification', 'established', 'partial only', '“loop”']);
    expect(describeFilters(initialState)).toEqual([]);
  });

  it('knows when anything is active', () => {
    expect(hasActiveFilters(initialState)).toBe(false);
    expect(hasActiveFilters({ ...initialState, query: ' x' })).toBe(true);
    expect(
      hasActiveFilters({ ...initialState, filters: { ...emptyFilters, partialOnly: true } }),
    ).toBe(true);
  });
});
