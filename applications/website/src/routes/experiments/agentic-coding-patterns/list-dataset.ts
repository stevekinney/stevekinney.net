import type { PatternDataset } from './pattern-types';

/**
 * The part of the library the first view needs: every entry's identity, metadata, summary, and
 * links, which is what the list, filters, search, and graph read. The section bodies are blanked,
 * because they are most of the file's size and only an open entry or the comparison shows them.
 * The page prerenders this, then fetches the whole library after it hydrates.
 */
export const toListDataset = (dataset: PatternDataset): PatternDataset => ({
  ...dataset,
  entries: dataset.entries.map((entry) => ({
    ...entry,
    whenToUse: '',
    whenNotToUse: '',
    drawbacks: '',
  })),
});
