import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  generatedContentEnhancementsDirectory,
  websiteBuildRoot,
  websiteSvelteKitClientRoot,
  websiteVercelStaticRoot,
} from './content-paths.ts';

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

const directoryExists = async (directoryPath: string): Promise<boolean> => {
  try {
    const directoryStat = await stat(directoryPath);
    return directoryStat.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

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
    await cp(generatedContentEnhancementsDirectory, target.targetPath, { recursive: true });
  }
};

await syncGeneratedAssets();
