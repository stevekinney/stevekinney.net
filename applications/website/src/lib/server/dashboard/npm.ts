import { z } from 'zod';

import type { NpmPackageStats, NpmStats } from '$lib/dashboard-types';

const NPM_MAINTAINER = 'stevekinney';
const NPM_REGISTRY_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const NPM_DOWNLOADS_BASE_URL = 'https://api.npmjs.org/downloads/point/last-year';
const REQUEST_TIMEOUT_MILLISECONDS = 10_000;
const SEARCH_PAGE_SIZE = 100;
const MAX_SEARCH_PAGES = 5;
const BULK_CHUNK_SIZE = 50;
const TOP_PACKAGE_COUNT = 10;

const NpmSearchResultSchema = z.object({
  total: z.number(),
  objects: z.array(
    z.object({
      package: z.object({
        name: z.string(),
        version: z.string(),
        description: z.string().optional(),
      }),
    }),
  ),
});

const NpmSingleDownloadsSchema = z.object({ downloads: z.number() });
const NpmBulkDownloadsSchema = z.record(z.string(), NpmSingleDownloadsSchema.nullable());

const isScopedPackageName = (name: string): boolean => name.startsWith('@');

const chunk = <Item>(items: Item[], size: number): Item[][] => {
  const chunks: Item[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

/**
 * Searches the npm registry for every package this maintainer publishes,
 * following `from`-offset pagination (capped at `MAX_SEARCH_PAGES`) so the
 * download totals cover the whole result set — otherwise `packageCount`
 * could report more packages than the totals actually include.
 */
const fetchPackageSearch = async (
  fetchImpl: typeof globalThis.fetch,
): Promise<z.infer<typeof NpmSearchResultSchema>> => {
  const objects: z.infer<typeof NpmSearchResultSchema>['objects'] = [];
  let total = 0;

  for (let page = 0; page < MAX_SEARCH_PAGES; page += 1) {
    const offset = page * SEARCH_PAGE_SIZE;
    const query = `text=maintainer:${NPM_MAINTAINER}&size=${SEARCH_PAGE_SIZE}&from=${offset}`;
    const response = await fetchImpl(`${NPM_REGISTRY_SEARCH_URL}?${query}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    });

    if (!response.ok) {
      throw new Error(`npm registry search failed with status ${response.status}`);
    }

    const parsed = NpmSearchResultSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new Error('npm registry search response did not match the expected shape.');
    }

    total = parsed.data.total;
    objects.push(...parsed.data.objects);

    if (objects.length >= total || parsed.data.objects.length < SEARCH_PAGE_SIZE) break;
  }

  return { total, objects };
};

/** Fetches last-year downloads for one package. A 404 means zero downloads, not a failure. */
const fetchSingleDownloads = async (
  fetchImpl: typeof globalThis.fetch,
  name: string,
): Promise<number> => {
  const url = `${NPM_DOWNLOADS_BASE_URL}/${encodeURIComponent(name)}`;
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });

  if (response.status === 404) return 0;

  if (!response.ok) {
    throw new Error(`npm downloads request for ${name} failed with status ${response.status}`);
  }

  const parsed = NpmSingleDownloadsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`npm downloads response for ${name} did not match the expected shape.`);
  }

  return parsed.data.downloads;
};

/**
 * Fetches last-year downloads for several unscoped packages in one request.
 * A single-name chunk hits the same URL shape, but npm replies with the flat
 * single-package object instead of a name-keyed map, so it is routed through
 * `fetchSingleDownloads` instead of being parsed as a bulk response.
 */
const fetchBulkDownloads = async (
  fetchImpl: typeof globalThis.fetch,
  names: string[],
): Promise<Map<string, number>> => {
  if (names.length === 1) {
    const [name] = names;
    return new Map([[name, await fetchSingleDownloads(fetchImpl, name)]]);
  }

  const url = `${NPM_DOWNLOADS_BASE_URL}/${names.map(encodeURIComponent).join(',')}`;
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
  });

  if (!response.ok) {
    throw new Error(`npm downloads request failed with status ${response.status}`);
  }

  const parsed = NpmBulkDownloadsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('npm downloads response did not match the expected shape.');
  }

  const downloads = new Map<string, number>();
  for (const [name, stats] of Object.entries(parsed.data)) {
    downloads.set(name, stats?.downloads ?? 0);
  }

  return downloads;
};

/**
 * Fetches last-year downloads for every package. Unscoped packages are
 * chunked into bulk requests of `BULK_CHUNK_SIZE`; scoped packages (rejected
 * by the bulk endpoint) are fetched individually.
 */
const fetchDownloadsByPackage = async (
  fetchImpl: typeof globalThis.fetch,
  names: string[],
): Promise<Map<string, number>> => {
  const scopedNames = names.filter(isScopedPackageName);
  const unscopedNames = names.filter((name) => !isScopedPackageName(name));
  const unscopedChunks = chunk(unscopedNames, BULK_CHUNK_SIZE);

  const [bulkResults, scopedResults] = await Promise.all([
    Promise.all(unscopedChunks.map((chunkNames) => fetchBulkDownloads(fetchImpl, chunkNames))),
    Promise.all(
      scopedNames.map(async (name): Promise<[string, number]> => {
        const downloads = await fetchSingleDownloads(fetchImpl, name);
        return [name, downloads];
      }),
    ),
  ]);

  const downloads = new Map<string, number>();
  for (const chunkResult of bulkResults) {
    for (const [name, count] of chunkResult) downloads.set(name, count);
  }
  for (const [name, count] of scopedResults) downloads.set(name, count);

  return downloads;
};

/**
 * Fetches npm activity across every package Steve maintains: how many
 * packages, last-year downloads per package, and the totals across all of
 * them.
 */
export const fetchNpmStats = async (fetchImpl: typeof globalThis.fetch): Promise<NpmStats> => {
  const searchResult = await fetchPackageSearch(fetchImpl);
  const names = searchResult.objects.map((object) => object.package.name);
  const downloadsByName = await fetchDownloadsByPackage(fetchImpl, names);

  const topPackages: NpmPackageStats[] = searchResult.objects
    .map((object) => ({
      name: object.package.name,
      description: object.package.description,
      version: object.package.version,
      url: `https://www.npmjs.com/package/${object.package.name}`,
      downloadsLastYear: downloadsByName.get(object.package.name) ?? 0,
    }))
    .sort((a, b) => b.downloadsLastYear - a.downloadsLastYear)
    .slice(0, TOP_PACKAGE_COUNT);

  const totalDownloadsLastYear = Array.from(downloadsByName.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return { packageCount: searchResult.total, totalDownloadsLastYear, topPackages };
};
