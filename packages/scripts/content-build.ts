#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';
import { formatJson } from '@stevekinney/utilities/write-formatted-json';

import { generatedContentDataPath, generatedContentDirectory } from './content-paths.ts';
import { writeArtifact } from './build-artifacts.ts';
import { collectContentRepository } from './content-repository.ts';
import { reportMetadataIssues } from './content-metadata.ts';

const main = async (): Promise<void> => {
  console.log('Collecting content sources.');
  const repository = await collectContentRepository();
  console.log('Content collection complete.');

  const buildErrors = repository.validationIssues.filter((i) => i.severity !== 'warning');
  const buildWarnings = repository.validationIssues.filter((i) => i.severity === 'warning');

  if (buildWarnings.length > 0) {
    console.warn(`Content build: ${buildWarnings.length} warning(s):`);
    reportMetadataIssues(buildWarnings);
  }

  if (buildErrors.length > 0) {
    console.error('Content build failed validation:');
    reportMetadataIssues(buildErrors);
    process.exit(1);
  }

  await mkdir(generatedContentDirectory, { recursive: true });

  const generatedContent: GeneratedContent = {
    meta: repository.meta,
    siteIndex: repository.siteIndex,
    routes: repository.routes,
    writing: repository.writing,
    courses: repository.courses,
    lessons: repository.lessons,
    projects: repository.projects,
    prerenderEntries: repository.prerenderEntries,
  };

  const didWriteContentData = await writeArtifact(
    generatedContentDataPath,
    await formatJson(generatedContentDataPath, generatedContent),
  );
  const didWritePlaygroundInputs = await writeArtifact(
    path.join(generatedContentDirectory, 'playground-inputs.json'),
    `${JSON.stringify({ version: 1, examples: repository.playgrounds }, null, 2)}\n`,
  );
  const didWriteSiteCandidates = await writeArtifact(
    path.join(generatedContentDirectory, 'site-tailwind-candidates.txt'),
    `${repository.siteTailwindCandidates.join('\n')}\n`,
  );

  if (!didWriteContentData && !didWritePlaygroundInputs && !didWriteSiteCandidates) {
    console.log('Generated content artifacts are already up to date.');
    // Bun can keep these CLI tasks alive after the work is done, so exit explicitly.
    process.exit(0);
  }

  console.log(
    `Generated ${repository.meta.routeCount} routes from ${repository.meta.sourceFileCount} source files.`,
  );
  // Bun can keep these CLI tasks alive after the work is done, so exit explicitly.
  process.exit(0);
};

await main();
