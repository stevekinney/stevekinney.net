import path from 'node:path';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';

import { repositoryRoot } from '../content-paths.ts';

import type { WebsiteOutputInspection } from './inspect-website-output.ts';
import type { LatestTurboSummary } from './read-turbo-summary.ts';
import type {
  BuildReport,
  ContentReport,
  SizedFile,
  SizedFileReport,
  TurboReport,
} from './types.ts';

const websiteBuildTaskId = '@stevekinney/website#build';

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(2)} kB`;
};

const describeSizedFile = (file: SizedFile | null): SizedFileReport | null =>
  file
    ? {
        path: path.relative(repositoryRoot, file.path),
        bytes: file.bytes,
        formattedSize: formatBytes(file.bytes),
      }
    : null;

const buildTurboReport = (latestTurboSummary: LatestTurboSummary): TurboReport => {
  const { summaryPath, summary } = latestTurboSummary;
  const websiteBuildTask =
    summary?.tasks.find((task) => task.taskId === websiteBuildTaskId) ?? null;

  return {
    summaryPath: summaryPath ? path.relative(repositoryRoot, summaryPath) : null,
    execution: summary?.execution ?? null,
    websiteBuild: websiteBuildTask
      ? {
          hash: websiteBuildTask.hash,
          cacheStatus: websiteBuildTask.cache?.status ?? 'UNKNOWN',
          cacheSource: websiteBuildTask.cache?.source ?? 'UNKNOWN',
          timeSavedMilliseconds: websiteBuildTask.cache?.timeSaved ?? null,
        }
      : null,
  };
};

const buildContentReport = (generatedContent: GeneratedContent): ContentReport => ({
  sourceFileCount: generatedContent.meta.sourceFileCount,
  routeCount: generatedContent.meta.routeCount,
  playgroundCount: generatedContent.meta.playgroundCount,
  writingPostCount: generatedContent.writing.length,
  courseCount: generatedContent.courses.length,
  lessonCount: generatedContent.lessons.length,
  prerenderEntryCount:
    generatedContent.prerenderEntries.writing.length +
    generatedContent.prerenderEntries.courses.length +
    generatedContent.prerenderEntries.lessons.length,
});

/**
 * Assembles the canonical `BuildReport` object from three independent inputs:
 * the latest Turbo run summary, the generated-content metadata, and the
 * on-disk website build output. Purely functional: no I/O, no filesystem
 * writes.
 */
export const createBuildReport = (inputs: {
  generatedContent: GeneratedContent;
  latestTurboSummary: LatestTurboSummary;
  websiteOutput: WebsiteOutputInspection;
  generatedAt: Date;
}): BuildReport => {
  const { generatedContent, latestTurboSummary, websiteOutput, generatedAt } = inputs;

  return {
    generatedAt: generatedAt.toISOString(),
    turbo: buildTurboReport(latestTurboSummary),
    content: buildContentReport(generatedContent),
    prerender: {
      buildOutputRoot: websiteOutput.htmlOutputRoot
        ? path.relative(repositoryRoot, websiteOutput.htmlOutputRoot)
        : null,
      buildHtmlPageCount: websiteOutput.buildHtmlPageCount,
      prerenderedHtmlPageCount: websiteOutput.prerenderedHtmlPageCount,
    },
    assets: {
      largestClientChunk: describeSizedFile(websiteOutput.largestClientChunk),
      mainStylesheet: describeSizedFile(websiteOutput.mainStylesheet),
    },
  };
};
