import { experiment } from './experiment';
import { toListDataset } from './list-dataset';
import patterns from './patterns.json';
import { parseDataset } from './validate-dataset';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Checks `patterns.json`, the library built from the vault by
 * `bun run experiments:patterns:build`, while the page prerenders. A bad edit
 * fails the build. Only the list view's share goes into the page, because
 * SvelteKit serializes whatever `load` returns into the prerendered HTML. The
 * whole library is a static file the browser fetches after it hydrates. The
 * site build never reads the vault, because Vercel can't see it.
 */
export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
  dataset: toListDataset(parseDataset(patterns)),
});
