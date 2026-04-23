import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { repositoryRoot } from '../content-paths.ts';

import type { TurboRunSummary } from './types.ts';

const turboRunsDirectory = path.resolve(repositoryRoot, '.turbo', 'runs');

const findLatestTurboSummaryPath = async (): Promise<string | null> => {
  const explicitSummaryPath = process.env.TURBO_SUMMARY_FILE;
  if (explicitSummaryPath) {
    return explicitSummaryPath;
  }

  try {
    const files = await readdir(turboRunsDirectory);
    const summaryFiles = files.filter((fileName) => fileName.endsWith('.json'));
    if (summaryFiles.length === 0) {
      return null;
    }

    const filesWithStats = await Promise.all(
      summaryFiles.map(async (fileName) => {
        const filePath = path.resolve(turboRunsDirectory, fileName);
        return {
          filePath,
          modifiedTime: (await stat(filePath)).mtimeMs,
        };
      }),
    );

    filesWithStats.sort((left, right) => right.modifiedTime - left.modifiedTime);
    return filesWithStats[0]?.filePath ?? null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

export type LatestTurboSummary = {
  summaryPath: string | null;
  summary: TurboRunSummary | null;
};

/**
 * Locates the most recent Turbo run summary JSON and parses it, or returns
 * `{ summaryPath: null, summary: null }` if no summary is available.
 * Honours `TURBO_SUMMARY_FILE` if set, for use in CI.
 */
export const readLatestTurboSummary = async (): Promise<LatestTurboSummary> => {
  const summaryPath = await findLatestTurboSummaryPath();
  if (!summaryPath) {
    return { summaryPath: null, summary: null };
  }

  const summary = JSON.parse(await readFile(summaryPath, 'utf8')) as TurboRunSummary;
  return { summaryPath, summary };
};
