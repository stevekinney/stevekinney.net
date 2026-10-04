import { experiment } from './experiment';
import patterns from './patterns.json';
import { parseDataset } from './validate-dataset';
import type { PageServerLoad } from './$types';

export const prerender = true;

/**
 * Checks `patterns.json`, the library built from the vault by
 * `bun run experiments:patterns:build`, while the page prerenders. A bad edit
 * fails the build, and the browser gets plain data. The site build never reads
 * the vault, because Vercel can't see it.
 */
export const load: PageServerLoad = () => ({
  title: experiment.title,
  description: experiment.description,
  dataset: parseDataset(patterns),
});
