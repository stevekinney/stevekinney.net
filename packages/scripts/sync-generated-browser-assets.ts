#!/usr/bin/env bun
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  directoryExists,
  generatedContentEnhancementsDirectory,
  websiteBuildRoot,
  websiteSvelteKitClientRoot,
  websiteVercelStaticRoot,
} from './content-paths.ts';

const isBuildMetadataFile = (sourcePath: string): boolean =>
  path.basename(sourcePath) === '.build-hash';

const generatedAssetTargets = [
  {
    basePath: websiteBuildRoot,
    targetPath: path.resolve(websiteBuildRoot, 'generated', 'content-enhancements'),
  },
  {
    basePath: websiteSvelteKitClientRoot,
    targetPath: path.resolve(websiteSvelteKitClientRoot, 'generated', 'content-enhancements'),
  },
  {
    basePath: websiteVercelStaticRoot,
    targetPath: path.resolve(websiteVercelStaticRoot, 'generated', 'content-enhancements'),
  },
];

const syncGeneratedAssets = async (): Promise<void> => {
  const sourceExists = await directoryExists(generatedContentEnhancementsDirectory);
  if (!sourceExists) {
    console.error(
      `Generated content enhancement assets are missing at ${generatedContentEnhancementsDirectory}.`,
    );
    process.exit(1);
  }

  for (const target of generatedAssetTargets) {
    const targetRootExists = await directoryExists(target.basePath);

    if (!targetRootExists) {
      continue;
    }

    await rm(target.targetPath, { recursive: true, force: true });
    await mkdir(path.dirname(target.targetPath), { recursive: true });
    await cp(generatedContentEnhancementsDirectory, target.targetPath, {
      recursive: true,
      filter: (sourcePath) => !isBuildMetadataFile(sourcePath),
    });
  }
};

await syncGeneratedAssets();
