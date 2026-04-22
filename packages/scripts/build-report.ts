import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';

import {
  generatedContentDataPath,
  repositoryRoot,
  websiteBuildRoot,
  websiteRoot,
  websiteSvelteKitClientRoot,
} from './content-paths.ts';

type TurboTaskCache = {
  status?: string;
  source?: string;
  timeSaved?: number;
};

type TurboTaskSummary = {
  taskId: string;
  hash: string;
  cache?: TurboTaskCache;
};

type TurboExecutionSummary = {
  cached: number;
  attempted: number;
  startTime: number;
  endTime: number;
};

type TurboRunSummary = {
  id: string;
  execution: TurboExecutionSummary;
  tasks: TurboTaskSummary[];
};

type SizedFile = {
  path: string;
  bytes: number;
};

const buildReportDirectory = path.resolve(repositoryRoot, 'tmp', 'build-report');
const buildReportJsonPath = path.resolve(buildReportDirectory, 'website-build-report.json');
const buildReportMarkdownPath = path.resolve(buildReportDirectory, 'website-build-report.md');
const turboRunsDirectory = path.resolve(repositoryRoot, '.turbo', 'runs');
const websiteBuildTaskId = '@stevekinney/website#build';

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(2)} kB`;
};

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

const countFiles = async (
  directoryPath: string,
  matcher: (filePath: string) => boolean,
): Promise<number> => {
  const files = await listFilesRecursively(directoryPath);
  return files.filter(matcher).length;
};

const main = async (): Promise<void> => {
  const generatedContent = JSON.parse(
    await readFile(generatedContentDataPath, 'utf8'),
  ) as GeneratedContent;

  const latestTurboSummaryPath = await findLatestTurboSummaryPath();
  const turboSummary = latestTurboSummaryPath
    ? (JSON.parse(await readFile(latestTurboSummaryPath, 'utf8')) as TurboRunSummary)
    : null;

  const websiteBuildTask =
    turboSummary?.tasks.find((task) => task.taskId === websiteBuildTaskId) ?? null;

  const largestClientChunk = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable'),
    (filePath) => filePath.endsWith('.js'),
  );

  const mainStylesheet = await getLargestFile(
    path.resolve(websiteSvelteKitClientRoot, '_app', 'immutable', 'assets'),
    (filePath) => filePath.endsWith('.css'),
  );

  const buildHtmlPageCount = await countFiles(websiteBuildRoot, (filePath) =>
    filePath.endsWith('.html'),
  );
  const prerenderedHtmlPageCount = await countFiles(
    path.resolve(websiteRoot, '.svelte-kit', 'output', 'prerendered', 'pages'),
    (filePath) => filePath.endsWith('.html'),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    turbo: {
      summaryPath: latestTurboSummaryPath
        ? path.relative(repositoryRoot, latestTurboSummaryPath)
        : null,
      execution: turboSummary?.execution ?? null,
      websiteBuild: websiteBuildTask
        ? {
            hash: websiteBuildTask.hash,
            cacheStatus: websiteBuildTask.cache?.status ?? 'UNKNOWN',
            cacheSource: websiteBuildTask.cache?.source ?? 'UNKNOWN',
            timeSavedMilliseconds: websiteBuildTask.cache?.timeSaved ?? null,
          }
        : null,
    },
    content: {
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
    },
    prerender: {
      buildHtmlPageCount,
      prerenderedHtmlPageCount,
    },
    assets: {
      largestClientChunk: largestClientChunk
        ? {
            path: path.relative(repositoryRoot, largestClientChunk.path),
            bytes: largestClientChunk.bytes,
            formattedSize: formatBytes(largestClientChunk.bytes),
          }
        : null,
      mainStylesheet: mainStylesheet
        ? {
            path: path.relative(repositoryRoot, mainStylesheet.path),
            bytes: mainStylesheet.bytes,
            formattedSize: formatBytes(mainStylesheet.bytes),
          }
        : null,
    },
  };

  const markdownReport = [
    '# Website Build Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Turbo',
    '',
    `- Summary: ${report.turbo.summaryPath ?? 'Unavailable'}`,
    `- Website build cache: ${report.turbo.websiteBuild?.cacheStatus ?? 'UNKNOWN'} (${report.turbo.websiteBuild?.cacheSource ?? 'UNKNOWN'})`,
    `- Website build hash: ${report.turbo.websiteBuild?.hash ?? 'Unavailable'}`,
    '',
    '## Content',
    '',
    `- Source files: ${report.content.sourceFileCount}`,
    `- Content routes: ${report.content.routeCount}`,
    `- Writing posts: ${report.content.writingPostCount}`,
    `- Courses: ${report.content.courseCount}`,
    `- Lessons: ${report.content.lessonCount}`,
    `- Tailwind playgrounds: ${report.content.playgroundCount}`,
    `- Generated prerender entries: ${report.content.prerenderEntryCount}`,
    '',
    '## Prerender',
    '',
    `- Built HTML pages: ${report.prerender.buildHtmlPageCount}`,
    `- SvelteKit prerendered HTML pages: ${report.prerender.prerenderedHtmlPageCount}`,
    '',
    '## Assets',
    '',
    `- Largest client chunk: ${report.assets.largestClientChunk?.formattedSize ?? 'Unavailable'} (${report.assets.largestClientChunk?.path ?? 'Unavailable'})`,
    `- Main stylesheet: ${report.assets.mainStylesheet?.formattedSize ?? 'Unavailable'} (${report.assets.mainStylesheet?.path ?? 'Unavailable'})`,
    '',
  ].join('\n');

  await mkdir(buildReportDirectory, { recursive: true });
  await writeFile(buildReportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(buildReportMarkdownPath, markdownReport, 'utf8');

  console.log(`Wrote build report to ${path.relative(repositoryRoot, buildReportDirectory)}.`);
};

await main();
