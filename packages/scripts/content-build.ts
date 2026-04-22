import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { GeneratedContent } from '@stevekinney/utilities/content-types';
import { formatJson } from '@stevekinney/utilities/write-formatted-json';

import {
  contentEnhancementsEntryPath,
  generatedContentDataPath,
  generatedContentDirectory,
  generatedContentEnhancementsDirectory,
  tailwindPlaygroundSourcePath,
  websiteRoot,
} from './content-paths.ts';
import { collectContentRepository } from './content-repository.ts';

const writeIfChanged = async (filePath: string, contents: string): Promise<boolean> => {
  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing === contents) {
      return false;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  await writeFile(filePath, contents, 'utf8');
  return true;
};

const enhancementSourcePaths: readonly string[] = [
  contentEnhancementsEntryPath,
  path.resolve(websiteRoot, 'src', 'lib', 'copy-code-block-as-image.ts'),
  path.resolve(websiteRoot, 'src', 'lib', 'actions', 'enhance-code-blocks.ts'),
  path.resolve(websiteRoot, 'src', 'lib', 'actions', 'enhance-mermaid-diagrams.ts'),
  path.resolve(websiteRoot, 'src', 'lib', 'actions', 'enhance-tailwind-playgrounds.ts'),
  path.resolve(websiteRoot, 'src', 'lib', 'actions', 'enhance-tables.ts'),
];

const enhancementsBuildHashPath = path.resolve(
  generatedContentEnhancementsDirectory,
  '.build-hash',
);

const computeEnhancementSourceHash = async (): Promise<string> => {
  const hash = createHash('sha256');
  for (const sourcePath of enhancementSourcePaths) {
    const contents = await readFile(sourcePath);
    hash.update(sourcePath);
    hash.update('\0');
    hash.update(contents);
    hash.update('\0');
  }
  return hash.digest('hex');
};

const readExistingBuildHash = async (): Promise<string | null> => {
  try {
    return (await readFile(enhancementsBuildHashPath, 'utf8')).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const buildContentEnhancements = async (): Promise<boolean> => {
  const expectedHash = await computeEnhancementSourceHash();
  const existingHash = await readExistingBuildHash();
  if (existingHash === expectedHash) {
    return false;
  }

  await rm(generatedContentEnhancementsDirectory, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [contentEnhancementsEntryPath],
    outdir: generatedContentEnhancementsDirectory,
    target: 'browser',
    format: 'esm',
    splitting: true,
    minify: true,
  });

  if (!result.success) {
    console.error('Failed to build content enhancement assets.');
    for (const log of result.logs) {
      console.error(log.message);
    }
    process.exit(1);
  }

  await writeFile(enhancementsBuildHashPath, expectedHash, 'utf8');
  return true;
};

const main = async (): Promise<void> => {
  const repository = await collectContentRepository();

  if (repository.validationIssues.length > 0) {
    console.error('Content build failed validation:');
    for (const issue of repository.validationIssues) {
      console.error(`- ${issue.file}: ${issue.message}`);
    }
    process.exit(1);
  }

  await mkdir(generatedContentDirectory, { recursive: true });
  const didBuildEnhancements = await buildContentEnhancements();

  const generatedContent: GeneratedContent = {
    meta: repository.meta,
    siteIndex: repository.siteIndex,
    routes: repository.routes,
    writing: repository.writing,
    courses: repository.courses,
    lessons: repository.lessons,
    prerenderEntries: repository.prerenderEntries,
  };

  const didWriteContentData = await writeIfChanged(
    generatedContentDataPath,
    await formatJson(generatedContentDataPath, generatedContent),
  );
  const didWriteTailwindSource = await writeIfChanged(
    tailwindPlaygroundSourcePath,
    repository.tailwindPlaygroundSource,
  );

  if (!didWriteContentData && !didWriteTailwindSource && !didBuildEnhancements) {
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
