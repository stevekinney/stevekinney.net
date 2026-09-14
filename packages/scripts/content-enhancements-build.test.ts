import { afterEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildContentEnhancements } from './content-enhancements-build.ts';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('enhancements reuse verified outputs and repair missing or corrupt files', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'enhancement-build-'));
  directories.push(workspaceRoot);
  const packageRoot = path.join(workspaceRoot, 'packages/content-enhancements');
  const outputDirectory = path.join(workspaceRoot, 'public');
  await mkdir(path.join(packageRoot, 'src'), { recursive: true });
  await mkdir(path.join(workspaceRoot, 'packages/utilities'), { recursive: true });
  const utilityPath = path.join(workspaceRoot, 'packages/utilities/example.ts');
  await writeFile(utilityPath, 'export const value = "original";');
  await writeFile(
    path.join(packageRoot, 'src/content-enhancements.ts'),
    'import { value } from "../../utilities/example.ts"; document.body.dataset.example = value;',
  );
  const options = { workspaceRoot, packageRoot, outputDirectory };
  expect((await buildContentEnhancements(options)).bundles).toBe(1);
  const entryPath = path.join(outputDirectory, 'content-enhancements.js');
  const contents = await readFile(entryPath, 'utf8');
  const timestamp = (await stat(entryPath)).mtimeMs;
  expect(contents).toContain('original');
  expect(await buildContentEnhancements(options)).toEqual({ bundles: 0, writes: 0 });
  expect((await stat(entryPath)).mtimeMs).toBe(timestamp);
  await mkdir(path.join(workspaceRoot, 'courses'), { recursive: true });
  await writeFile(path.join(workspaceRoot, 'courses/article.md'), '# Changed prose');
  expect(await buildContentEnhancements(options)).toEqual({ bundles: 0, writes: 0 });
  await writeFile(entryPath, 'corrupt');
  expect((await buildContentEnhancements(options)).bundles).toBe(1);
  expect(await readFile(entryPath, 'utf8')).toBe(contents);
  await rm(entryPath);
  expect((await buildContentEnhancements(options)).bundles).toBe(1);
  await writeFile(utilityPath, 'export const value = "changed";');
  expect((await buildContentEnhancements(options)).bundles).toBe(1);
  expect(await readFile(entryPath, 'utf8')).toContain('changed');
  await writeFile(path.join(outputDirectory, '.build-metadata.json'), '{broken');
  expect((await buildContentEnhancements(options)).bundles).toBe(1);
  expect(await buildContentEnhancements(options)).toEqual({ bundles: 0, writes: 0 });
});

test('enhancement rebuild prunes obsolete chunk files before adapter sync can copy them', async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'enhancement-build-'));
  directories.push(workspaceRoot);
  const packageRoot = path.join(workspaceRoot, 'packages/content-enhancements');
  const outputDirectory = path.join(workspaceRoot, 'public');
  await mkdir(path.join(packageRoot, 'src'), { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(packageRoot, 'src/content-enhancements.ts'), 'export const value = 1;');
  await Promise.all(
    ['stale-chunk.js', 'another-stale-chunk.js', 'unused.css'].map((filename) =>
      writeFile(path.join(outputDirectory, filename), 'old'),
    ),
  );
  await writeFile(
    path.join(outputDirectory, '.build-hash'),
    'old metadata stays managed separately',
  );

  const result = await buildContentEnhancements({ workspaceRoot, packageRoot, outputDirectory });

  expect(result.bundles).toBe(1);
  // Three new output/metadata files and three stale-file removals.
  expect(result.writes).toBe(6);
  for (const filename of ['stale-chunk.js', 'another-stale-chunk.js', 'unused.css']) {
    await expect(readFile(path.join(outputDirectory, filename))).rejects.toThrow();
  }
  await expect(readFile(path.join(outputDirectory, '.build-hash'), 'utf8')).resolves.toBeTruthy();
});
