import { describe, expect, it, vi } from 'vitest';

import { fetchNpmStats } from './npm';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const searchObject = (name: string, downloads: number) => ({
  name,
  version: '1.0.0',
  description: `${name} package`,
  downloads,
});

type SearchPackage = ReturnType<typeof searchObject>;

/** Builds the `-/v1/search` response body for the given packages. */
const buildSearchResponse = (packages: SearchPackage[], total = packages.length) => ({
  total,
  objects: packages.map(({ name, version, description }) => ({
    package: { name, version, description },
  })),
});

type Handlers = {
  search?: (url: string) => Response;
  bulkDownloads?: (names: string[]) => Response;
  singleDownloads?: (name: string) => Response;
};

/** Builds a fetch stub covering npm registry search and downloads requests. */
const buildFetchMock = (packages: SearchPackage[], handlers: Handlers = {}) =>
  vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);

    if (url.startsWith('https://registry.npmjs.org/-/v1/search')) {
      return (handlers.search ?? (() => jsonResponse(buildSearchResponse(packages))))(url);
    }

    const downloadsPrefix = 'https://api.npmjs.org/downloads/point/last-year/';
    if (url.startsWith(downloadsPrefix)) {
      const rest = url.slice(downloadsPrefix.length);
      const names = rest.split(',').map(decodeURIComponent);

      if (names.length === 1) {
        const [name] = names;
        const found = packages.find((pkg) => pkg.name === name);

        if (handlers.singleDownloads) return handlers.singleDownloads(name);
        if (!found) return jsonResponse({ error: 'not found' }, 404);

        return jsonResponse({ downloads: found.downloads, package: name });
      }

      if (handlers.bulkDownloads) return handlers.bulkDownloads(names);

      const body: Record<string, { downloads: number; package: string } | null> = {};
      for (const name of names) {
        const found = packages.find((pkg) => pkg.name === name);
        body[name] = found ? { downloads: found.downloads, package: name } : null;
      }

      return jsonResponse(body);
    }

    throw new Error(`Unhandled fetch: ${url}`);
  });

describe('fetchNpmStats', () => {
  it('throws including the status code when the registry search fails', async () => {
    const fetchMock = buildFetchMock([], { search: () => jsonResponse({}, 500) });

    await expect(fetchNpmStats(fetchMock)).rejects.toThrow(/500/);
  });

  it('throws when the search response does not match the expected shape', async () => {
    const fetchMock = buildFetchMock([], { search: () => jsonResponse({ nope: true }) });

    await expect(fetchNpmStats(fetchMock)).rejects.toThrow(/did not match the expected shape/);
  });

  it('sums downloads and returns the package count from the search total', async () => {
    const packages = [searchObject('alpha', 100), searchObject('beta', 200)];
    const fetchMock = buildFetchMock(packages, {
      search: () => jsonResponse(buildSearchResponse(packages, 45)),
    });

    const stats = await fetchNpmStats(fetchMock);

    expect(stats.packageCount).toBe(45);
    expect(stats.totalDownloadsLastYear).toBe(300);
  });

  it('paginates the registry search so totals cover every package, not just the first page', async () => {
    const allPackages = Array.from({ length: 150 }, (_, index) =>
      searchObject(`package-${index}`, 1),
    );
    const fetchMock = buildFetchMock(allPackages, {
      search: (url) => {
        const offset = Number(new URL(url).searchParams.get('from') ?? 0);

        return jsonResponse(buildSearchResponse(allPackages.slice(offset, offset + 100), 150));
      },
    });

    const stats = await fetchNpmStats(fetchMock);

    expect(stats.packageCount).toBe(150);
    expect(stats.totalDownloadsLastYear).toBe(150);
  });

  it('sorts topPackages by downloads descending and caps at 10', async () => {
    const packages = Array.from({ length: 12 }, (_, index) =>
      searchObject(`package-${index}`, index * 10),
    );
    const fetchMock = buildFetchMock(packages);

    const stats = await fetchNpmStats(fetchMock);

    expect(stats.topPackages).toHaveLength(10);
    expect(stats.topPackages[0]).toEqual({
      name: 'package-11',
      description: 'package-11 package',
      version: '1.0.0',
      url: 'https://www.npmjs.com/package/package-11',
      downloadsLastYear: 110,
    });
    expect(stats.topPackages.at(-1)?.name).toBe('package-2');
    expect(stats.topPackages.some((pkg) => pkg.name === 'package-0')).toBe(false);
    expect(stats.topPackages.some((pkg) => pkg.name === 'package-1')).toBe(false);
  });

  it('treats a null bulk download entry as zero downloads', async () => {
    const packages = [searchObject('has-downloads', 50), searchObject('missing', 0)];
    const fetchMock = buildFetchMock(packages, {
      bulkDownloads: (names) => {
        const body: Record<string, { downloads: number; package: string } | null> = {};

        for (const name of names) {
          body[name] = name === 'missing' ? null : { downloads: 50, package: name };
        }

        return jsonResponse(body);
      },
    });

    const stats = await fetchNpmStats(fetchMock);
    const missing = stats.topPackages.find((pkg) => pkg.name === 'missing');

    expect(missing?.downloadsLastYear).toBe(0);
  });

  it('fetches scoped packages individually instead of via the bulk endpoint', async () => {
    const packages = [searchObject('@stevekinney/scoped', 25)];
    const bulkDownloads = vi.fn();
    const fetchMock = buildFetchMock(packages, { bulkDownloads });

    const stats = await fetchNpmStats(fetchMock);

    expect(bulkDownloads).not.toHaveBeenCalled();
    expect(stats.topPackages[0]?.downloadsLastYear).toBe(25);
  });

  it('treats a 404 for an individual package as zero downloads rather than a failure', async () => {
    const packages = [searchObject('@stevekinney/missing', 0)];
    const fetchMock = buildFetchMock(packages, {
      singleDownloads: () => jsonResponse({ error: 'not found' }, 404),
    });

    const stats = await fetchNpmStats(fetchMock);
    expect(stats.topPackages[0]?.downloadsLastYear).toBe(0);
  });

  it('throws including the status code when an individual download request fails', async () => {
    const packages = [searchObject('@stevekinney/broken', 0)];
    const fetchMock = buildFetchMock(packages, {
      singleDownloads: () => jsonResponse({}, 500),
    });

    await expect(fetchNpmStats(fetchMock)).rejects.toThrow(/500/);
  });

  it('chunks unscoped packages into bulk requests of 50 names', async () => {
    const packages = Array.from({ length: 55 }, (_, index) => searchObject(`package-${index}`, 1));
    const bulkDownloads = vi.fn((names: string[]) => {
      const body: Record<string, { downloads: number; package: string }> = {};
      for (const name of names) body[name] = { downloads: 1, package: name };
      return jsonResponse(body);
    });
    const fetchMock = buildFetchMock(packages, { bulkDownloads });

    await fetchNpmStats(fetchMock);

    expect(bulkDownloads).toHaveBeenCalledTimes(2);
    expect(bulkDownloads.mock.calls[0]?.[0]).toHaveLength(50);
    expect(bulkDownloads.mock.calls[1]?.[0]).toHaveLength(5);
  });

  it('routes a single-name trailing chunk through the single-package endpoint', async () => {
    const packages = Array.from({ length: 51 }, (_, index) =>
      searchObject(`package-${index}`, index),
    );
    const bulkDownloads = vi.fn((names: string[]) => {
      const body: Record<string, { downloads: number; package: string }> = {};
      for (const name of names) body[name] = { downloads: 1, package: name };
      return jsonResponse(body);
    });
    const singleDownloads = vi.fn((name: string) => {
      const found = packages.find((pkg) => pkg.name === name);
      return jsonResponse({ downloads: found?.downloads ?? 0, package: name });
    });
    const fetchMock = buildFetchMock(packages, { bulkDownloads, singleDownloads });

    const stats = await fetchNpmStats(fetchMock);

    // The 51st package lands alone in the second chunk, so it must go through
    // the single-package endpoint (which npm returns in a flat, non-keyed shape).
    expect(bulkDownloads).toHaveBeenCalledTimes(1);
    expect(singleDownloads).toHaveBeenCalledWith('package-50');

    const last = stats.topPackages.find((pkg) => pkg.name === 'package-50');
    expect(last?.downloadsLastYear).toBe(50);
  });
});
