#!/usr/bin/env bun
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { hashArtifact, readCache, verifyArtifact, writeArtifact } from './build-artifacts.ts';
import { computeContentEnhancementBuildHash } from './content-enhancement-build-hash.ts';
import {
  contentEnhancementsEntryPath,
  contentEnhancementsPackageRoot,
  generatedContentEnhancementsDirectory,
  repositoryRoot,
} from './content-paths.ts';

const metadataSchema = z.object({ hash: z.string(), files: z.record(z.string(), z.string()) });

type EnhancementBuildOptions = {
  packageRoot?: string;
  workspaceRoot?: string;
  outputDirectory?: string;
};

const removeStaleOutputFiles = async (
  outputDirectory: string,
  currentFiles: Set<string>,
): Promise<number> => {
  let entries;
  try {
    entries = await readdir(outputDirectory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw error;
  }

  let removals = 0;
  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || entry.name.startsWith('.') || currentFiles.has(entry.name)) return;
      await rm(path.join(outputDirectory, entry.name), { force: true });
      removals += 1;
    }),
  );
  return removals;
};

/** Build browser enhancements independently of Markdown collection. */
export const buildContentEnhancements = async (
  options: EnhancementBuildOptions = {},
): Promise<{ bundles: number; writes: number }> => {
  const packageRoot = options.packageRoot ?? contentEnhancementsPackageRoot;
  const workspaceRoot = options.workspaceRoot ?? repositoryRoot;
  const outputDirectory = options.outputDirectory ?? generatedContentEnhancementsDirectory;
  const entryPath = options.packageRoot
    ? path.join(packageRoot, 'src/content-enhancements.ts')
    : contentEnhancementsEntryPath;
  const hash = await computeContentEnhancementBuildHash(packageRoot, workspaceRoot);
  const metadataPath = path.join(outputDirectory, '.build-metadata.json');
  const hashPath = path.join(outputDirectory, '.build-hash');
  const cached = metadataSchema.safeParse(await readCache(metadataPath));
  if (cached.success && cached.data.hash === hash && Object.keys(cached.data.files).length > 0) {
    const complete = await Promise.all(
      Object.entries(cached.data.files).map(([filename, digest]) => {
        if (path.basename(filename) !== filename) return false;
        return verifyArtifact(path.join(outputDirectory, filename), digest);
      }),
    );
    if (complete.every(Boolean) && (await verifyArtifact(hashPath, hashArtifact(hash))))
      return { bundles: 0, writes: 0 };
  }
  const result = await Bun.build({
    entrypoints: [entryPath],
    target: 'browser',
    format: 'esm',
    splitting: true,
    minify: true,
  });
  if (!result.success)
    throw new Error(
      `Failed to build enhancements:\n${result.logs.map((log) => log.message).join('\n')}`,
    );
  const files: Record<string, string> = {};
  let writes = 0;
  for (const output of result.outputs.sort(
    (left, right) => Number(left.kind === 'entry-point') - Number(right.kind === 'entry-point'),
  )) {
    const filename = path.basename(output.path);
    const bytes = new Uint8Array(await output.arrayBuffer());
    files[filename] = hashArtifact(bytes);
    if (await writeArtifact(path.join(outputDirectory, filename), bytes)) writes += 1;
  }
  writes += await removeStaleOutputFiles(outputDirectory, new Set(Object.keys(files)));
  if (await writeArtifact(metadataPath, `${JSON.stringify({ hash, files }, null, 2)}\n`))
    writes += 1;
  if (await writeArtifact(hashPath, hash)) writes += 1;
  return { bundles: 1, writes };
};

if (import.meta.main) {
  const metrics = await buildContentEnhancements();
  await writeArtifact(
    path.join(repositoryRoot, 'tmp', 'build-report', 'enhancement-build-metrics.json'),
    `${JSON.stringify(metrics)}\n`,
  );
  console.log(
    `Content enhancements: ${metrics.bundles} bundles, ${metrics.writes} artifact writes.`,
  );
}
