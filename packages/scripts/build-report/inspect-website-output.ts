import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  directoryExists,
  websiteBuildRoot,
  websiteRoot,
  websiteSvelteKitClientRoot,
  websiteVercelStaticRoot,
} from '../content-paths.ts';

import type { SizedFile } from './types.ts';

export const htmlFileMatcher = (filePath: string): boolean => filePath.endsWith('.html');

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

const getLargestFile = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<SizedFile | null> => {
  const files = (await listFilesRecursively(directoryPath)).filter(matcher);
  if (files.length === 0) {
    return null;
  }

  const sizedFiles = await Promise.all(
    files.map(async (filePath) => ({
      path: filePath,
      bytes: (await stat(filePath)).size,
    })),
  );

  return sizedFiles.reduce((largest, current) =>
    current.bytes > largest.bytes ? current : largest,
  );
};

export const resolveWebsiteHtmlOutputRoot = async (): Promise<string | null> =>
  findFirstDirectoryWithMatchingFile([websiteBuildRoot, websiteVercelStaticRoot], htmlFileMatcher);

export type WebsiteOutputInspection = {
  htmlOutputRoot: string | null;
  buildHtmlPageCount: number;
  prerenderedHtmlPageCount: number;
  largestClientChunk: SizedFile | null;
  mainStylesheet: SizedFile | null;
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
  const largestClientChunk = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable'),
    (filePath) => filePath.endsWith('.js'),
  );
  const mainStylesheet = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable', 'assets'),
    (filePath) => filePath.endsWith('.css'),
  );

  return {
    htmlOutputRoot,
    buildHtmlPageCount,
    prerenderedHtmlPageCount,
    largestClientChunk,
    mainStylesheet,
  };
};
