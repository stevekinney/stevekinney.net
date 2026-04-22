import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';

import { generatedContentDataPath, repositoryRoot } from '../content-paths.ts';

import { createBuildReport } from './create-build-report.ts';
import { inspectWebsiteOutput } from './inspect-website-output.ts';
import { readLatestTurboSummary } from './read-turbo-summary.ts';
import { renderMarkdownReport } from './render-markdown.ts';

const buildReportDirectory = path.resolve(repositoryRoot, 'tmp', 'build-report');
const buildReportJsonPath = path.resolve(buildReportDirectory, 'website-build-report.json');
const buildReportMarkdownPath = path.resolve(buildReportDirectory, 'website-build-report.md');

export const main = async (): Promise<void> => {
  const generatedContent = JSON.parse(
    await readFile(generatedContentDataPath, 'utf8'),
  ) as GeneratedContent;

  const [latestTurboSummary, websiteOutput] = await Promise.all([
    readLatestTurboSummary(),
    inspectWebsiteOutput(),
  ]);

  const report = createBuildReport({
    generatedContent,
    latestTurboSummary,
    websiteOutput,
    generatedAt: new Date(),
  });

  await mkdir(buildReportDirectory, { recursive: true });
  await writeFile(buildReportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(buildReportMarkdownPath, renderMarkdownReport(report), 'utf8');

  console.log(`Wrote build report to ${path.relative(repositoryRoot, buildReportDirectory)}.`);
};

if (import.meta.main) {
  await main();
}
