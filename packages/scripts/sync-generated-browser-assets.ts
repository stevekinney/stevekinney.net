#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  directoryExists,
  generatedContentEnhancementsDirectory,
  websiteBuildRoot,
  websiteSvelteKitClientRoot,
  websiteVercelStaticRoot,
} from './content-paths.ts';

const metadataSchema = z.object({
  hash: z.string(),
  files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
});

type GeneratedAssetTarget = {
  adapter: 'client' | 'static' | 'vercel';
  basePath: string;
  targetPath: string;
};

const generatedAssetTargets: GeneratedAssetTarget[] = [
  {
    adapter: 'static',
    basePath: websiteBuildRoot,
    targetPath: path.resolve(websiteBuildRoot, 'generated', 'content-enhancements'),
  },
  {
    adapter: 'client',
    basePath: websiteSvelteKitClientRoot,
    targetPath: path.resolve(websiteSvelteKitClientRoot, 'generated', 'content-enhancements'),
  },
  {
    adapter: 'vercel',
    basePath: path.dirname(websiteVercelStaticRoot),
    targetPath: path.resolve(websiteVercelStaticRoot, 'generated', 'content-enhancements'),
  },
];

const readGeneratedEnhancementFiles = async (sourceDirectory: string): Promise<string[]> => {
  const metadataPath = path.join(sourceDirectory, '.build-metadata.json');
  const metadata = metadataSchema.parse(JSON.parse(await readFile(metadataPath, 'utf8')));
  const files = Object.keys(metadata.files).sort();
  for (const filename of files) {
    if (path.basename(filename) !== filename) {
      throw new Error(`Invalid generated enhancement filename '${filename}'.`);
    }
    const bytes = await readFile(path.join(sourceDirectory, filename));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== metadata.files[filename]) {
      throw new Error(`Generated enhancement digest mismatch for '${filename}'.`);
    }
  }
  return files;
};

const removeInactiveAdapterOutputs = async (
  targets: readonly GeneratedAssetTarget[],
  selectedAdapter: 'static' | 'vercel',
): Promise<void> => {
  const inactiveAdapter = selectedAdapter === 'static' ? 'vercel' : 'static';
  await Promise.all(
    targets
      .filter((target) => target.adapter === inactiveAdapter)
      .map((target) => rm(target.basePath, { recursive: true, force: true })),
  );
};

const assertSelectedAdapterOutput = async (
  targets: readonly GeneratedAssetTarget[],
  selectedAdapter: 'static' | 'vercel',
): Promise<void> => {
  const selectedTarget = targets.find((target) => target.adapter === selectedAdapter);
  if (!selectedTarget) throw new Error(`Missing generated asset target for ${selectedAdapter}.`);
  if (await directoryExists(selectedTarget.basePath)) return;
  throw new Error(
    `Selected ${selectedAdapter} adapter output is missing at ${selectedTarget.basePath}.`,
  );
};

const isActiveTarget = (
  target: GeneratedAssetTarget,
  selectedAdapter: 'static' | 'vercel',
): boolean => target.adapter === 'client' || target.adapter === selectedAdapter;

export const syncGeneratedAssets = async (
  sourceDirectory = generatedContentEnhancementsDirectory,
  targets = generatedAssetTargets,
  selectedAdapter: 'static' | 'vercel' = process.env.VERCEL ? 'vercel' : 'static',
): Promise<void> => {
  const sourceExists = await directoryExists(sourceDirectory);
  if (!sourceExists) {
    throw new Error(`Generated content enhancement assets are missing at ${sourceDirectory}.`);
  }

  const files = await readGeneratedEnhancementFiles(sourceDirectory);
  await assertSelectedAdapterOutput(targets, selectedAdapter);
  await removeInactiveAdapterOutputs(targets, selectedAdapter);

  for (const target of targets.filter((target) => isActiveTarget(target, selectedAdapter))) {
    const targetRootExists = await directoryExists(target.basePath);

    if (!targetRootExists) {
      continue;
    }

    await rm(target.targetPath, { recursive: true, force: true });
    await mkdir(target.targetPath, { recursive: true });
    await Promise.all(
      files.map((filename) =>
        cp(path.join(sourceDirectory, filename), path.join(target.targetPath, filename)),
      ),
    );
  }
};

if (import.meta.main) {
  try {
    await syncGeneratedAssets();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
