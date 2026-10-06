import { gzipSync } from 'node:zlib';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  directoryExists,
  generatedContentEnhancementsDirectory,
  websiteBuildRoot,
  websiteRoot,
  websiteSvelteKitClientRoot,
  websiteVercelStaticRoot,
} from '../content-paths.ts';

import { findEagerClientFiles, readClientManifest } from './client-chunks.ts';
import type { SizedFile } from './types.ts';

const htmlFileMatcher = (filePath: string): boolean => filePath.endsWith('.html');

const listFilesRecursively = async (directoryPath: string): Promise<string[]> => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.resolve(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listFilesRecursively(entryPath);
      }

      if (entry.isFile()) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat();
};

const directoryContainsMatchingFile = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<boolean> => {
  if (!(await directoryExists(directoryPath))) {
    return false;
  }

  const files = await listFilesRecursively(directoryPath);
  return files.some(matcher);
};

/** Select the first adapter output directory that contains at least one matching file. */
export const findFirstDirectoryWithMatchingFile = async (
  directoryPaths: readonly string[],
  matcher: (filePath: string) => boolean,
): Promise<string | null> => {
  for (const directoryPath of directoryPaths) {
    if (await directoryContainsMatchingFile(directoryPath, matcher)) {
      return directoryPath;
    }
  }

  return null;
};

const countFiles = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<number> => {
  const files = await listFilesRecursively(directoryPath);
  return files.filter(matcher).length;
};

export const countFilesIfDirectoryExists = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<number> => {
  if (!(await directoryExists(directoryPath))) {
    return 0;
  }

  return countFiles(directoryPath, matcher);
};

export const getLargestFile = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<SizedFile | null> => {
  const files = (await listFilesRecursively(directoryPath)).filter(matcher);
  if (files.length === 0) {
    return null;
  }

  const sizedFiles = await Promise.all(
    files.map(async (filePath) => {
      const bytes = (await stat(filePath)).size;
      const contents = await readFile(filePath);
      const gzipBytes = gzipSync(contents).length;
      return { path: filePath, bytes, gzipBytes };
    }),
  );

  return sizedFiles.reduce((largest, current) =>
    current.bytes > largest.bytes ? current : largest,
  );
};

/**
 * Whether a client file is only ever loaded on demand, through `import()` in a
 * component, according to the build's manifest. Without a manifest, or for a
 * file the manifest doesn't list, the answer is no, so the stricter up-front
 * budget applies.
 */
const createLazyClientFileMatcher = async (): Promise<(filePath: string) => boolean> => {
  const manifest = await readClientManifest(
    path.resolve(websiteSvelteKitClientRoot, '.vite', 'manifest.json'),
  );
  if (!manifest) return () => false;

  const eager = findEagerClientFiles(manifest);
  const listed = new Set(Object.values(manifest).map((chunk) => chunk.file));

  return (filePath) => {
    const file = path.relative(websiteSvelteKitClientRoot, filePath).split(path.sep).join('/');
    return listed.has(file) && !eager.has(file);
  };
};

const resolveWebsiteHtmlOutputRoot = async (): Promise<string | null> =>
  findFirstDirectoryWithMatchingFile([websiteBuildRoot, websiteVercelStaticRoot], htmlFileMatcher);

export type WebsiteOutputInspection = {
  htmlOutputRoot: string | null;
  buildHtmlPageCount: number;
  prerenderedHtmlPageCount: number;
  largestClientChunk: SizedFile | null;
  largestLazyClientChunk: SizedFile | null;
  mainStylesheet: SizedFile | null;
  largestEnhancementChunk: SizedFile | null;
};

/**
 * Inspects the website's build output directories: counts HTML pages in the
 * selected adapter output, counts SvelteKit prerendered pages, and returns
 * the largest client JS chunk and main CSS stylesheet for the build report.
 */
export const inspectWebsiteOutput = async (): Promise<WebsiteOutputInspection> => {
  const htmlOutputRoot = await resolveWebsiteHtmlOutputRoot();

  const buildHtmlPageCount = htmlOutputRoot ? await countFiles(htmlOutputRoot, htmlFileMatcher) : 0;
  const prerenderedHtmlPageCount = await countFilesIfDirectoryExists(
    path.resolve(websiteRoot, '.svelte-kit', 'output', 'prerendered', 'pages'),
    htmlFileMatcher,
  );
  const isLazyClientFile = await createLazyClientFileMatcher();
  const largestClientChunk = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable'),
    (filePath) => filePath.endsWith('.js') && !isLazyClientFile(filePath),
  );
  const largestLazyClientChunk = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable'),
    (filePath) => filePath.endsWith('.js') && isLazyClientFile(filePath),
  );
  const mainStylesheet = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable', 'assets'),
    (filePath) => filePath.endsWith('.css'),
  );
  const largestEnhancementChunk = (await directoryExists(generatedContentEnhancementsDirectory))
    ? await getLargestFile(generatedContentEnhancementsDirectory, (filePath) =>
        filePath.endsWith('.js'),
      )
    : null;

  return {
    htmlOutputRoot,
    buildHtmlPageCount,
    prerenderedHtmlPageCount,
    largestClientChunk,
    largestLazyClientChunk,
    mainStylesheet,
    largestEnhancementChunk,
  };
};
