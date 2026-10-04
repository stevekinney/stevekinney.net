import { describe, expect, it } from 'vitest';

import { experiments } from './registry';

const foldersWith = (files: Record<string, unknown>): string[] =>
  Object.keys(files)
    .map((file) => file.split('/').at(-2) ?? '')
    .sort();

const pageFolders = foldersWith(import.meta.glob('/src/routes/experiments/*/+page.svelte'));
const metadataFolders = foldersWith(import.meta.glob('/src/routes/experiments/*/experiment.ts'));

describe('experiment registry', () => {
  it('registers every experiment page through an experiment.ts beside it', () => {
    expect(metadataFolders).toEqual(pageFolders);
  });

  it.each(experiments)('$slug describes itself and has a real date', (experiment) => {
    expect(experiment.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(experiment.path).toBe(`/experiments/${experiment.slug}`);
    expect(experiment.title.trim()).not.toBe('');
    expect(experiment.description.trim().length).toBeGreaterThan(40);
    expect(experiment.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(`${experiment.added}T00:00:00Z`).toISOString().slice(0, 10)).toBe(
      experiment.added,
    );
  });

  it('lists the newest experiments first', () => {
    const dates = experiments.map((experiment) => experiment.added);

    expect(dates).toEqual([...dates].sort().reverse());
  });
});
