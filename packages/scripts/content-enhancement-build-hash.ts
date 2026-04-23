import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import fg from 'fast-glob';

const CONTENT_ENHANCEMENT_PACKAGE_INPUTS = [
  'package.json',
  'tsconfig.json',
  'src/**/*.{ts,tsx,js,jsx,css,json,svg,png,jpg,jpeg,webp,avif,gif}',
];

const REPOSITORY_DEPENDENCY_INPUTS = ['package.json', 'bun.lock'];

export type HashInput = {
  cacheKey: string;
  filePath: string;
};

const listHashInputsForRoot = async (
  rootDirectory: string,
  cacheKeyPrefix: string,
  patterns: readonly string[],
): Promise<HashInput[]> => {
  const matches = await fg(patterns, {
    cwd: rootDirectory,
    absolute: true,
    onlyFiles: true,
    dot: true,
  });

  return matches.map((filePath) => ({
    cacheKey: `${cacheKeyPrefix}/${path.relative(rootDirectory, filePath)}`,
    filePath,
  }));
};

export const listContentEnhancementBuildHashInputs = async (
  contentEnhancementsPackageRoot: string,
  repositoryRoot: string,
): Promise<HashInput[]> => {
  const inputs = [
    ...(await listHashInputsForRoot(
      contentEnhancementsPackageRoot,
      'content-enhancements',
      CONTENT_ENHANCEMENT_PACKAGE_INPUTS,
    )),
    ...(await listHashInputsForRoot(repositoryRoot, 'repository', REPOSITORY_DEPENDENCY_INPUTS)),
  ];

  return inputs.sort((left, right) => left.cacheKey.localeCompare(right.cacheKey));
};

export const computeContentEnhancementBuildHash = async (
  contentEnhancementsPackageRoot: string,
  repositoryRoot: string,
): Promise<string> => {
  const hash = createHash('sha256');

  for (const input of await listContentEnhancementBuildHashInputs(
    contentEnhancementsPackageRoot,
    repositoryRoot,
  )) {
    hash.update(input.cacheKey);
    hash.update('\0');
    hash.update(await readFile(input.filePath));
    hash.update('\0');
  }

  return hash.digest('hex');
};
