import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'bun:test';

import {
  countFilesIfDirectoryExists,
  findFirstDirectoryWithMatchingFile,
} from './inspect-website-output.ts';

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'build-report-'));
  temporaryDirectories.push(temporaryDirectory);
  return temporaryDirectory;
};

const writeTextFile = async (filePath: string, contents: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((temporaryDirectory) => rm(temporaryDirectory, { recursive: true, force: true })),
  );
});

describe('build report output discovery', () => {
  test('skips an existing adapter output directory when it does not contain html files', async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const staticBuildRoot = path.join(temporaryDirectory, 'build');
    const vercelStaticRoot = path.join(temporaryDirectory, '.vercel', 'output', 'static');

    await writeTextFile(path.join(staticBuildRoot, 'assets', 'styles.css'), 'body {}');
    await writeTextFile(path.join(vercelStaticRoot, 'index.html'), '<html></html>');

    expect(
      await findFirstDirectoryWithMatchingFile([staticBuildRoot, vercelStaticRoot], (filePath) =>
        filePath.endsWith('.html'),
      ),
    ).toBe(vercelStaticRoot);
  });

  test('returns null when no adapter output directory contains a matching file', async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const staticBuildRoot = path.join(temporaryDirectory, 'build');
    const vercelStaticRoot = path.join(temporaryDirectory, '.vercel', 'output', 'static');

    await writeTextFile(path.join(staticBuildRoot, 'assets', 'styles.css'), 'body {}');
    await writeTextFile(path.join(vercelStaticRoot, 'assets', 'bundle.js'), 'console.log(1);');

    expect(
      await findFirstDirectoryWithMatchingFile([staticBuildRoot, vercelStaticRoot], (filePath) =>
        filePath.endsWith('.html'),
      ),
    ).toBeNull();
  });

  test('falls back to the Vercel static output when the static adapter output is absent', async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const staticBuildRoot = path.join(temporaryDirectory, 'build');
    const vercelStaticRoot = path.join(temporaryDirectory, '.vercel', 'output', 'static');

    await writeTextFile(path.join(vercelStaticRoot, 'index.html'), '<html></html>');

    expect(
      await findFirstDirectoryWithMatchingFile([staticBuildRoot, vercelStaticRoot], (filePath) =>
        filePath.endsWith('.html'),
      ),
    ).toBe(vercelStaticRoot);
  });

  test('returns zero instead of throwing when a build output directory is missing', async () => {
    const temporaryDirectory = await createTemporaryDirectory();

    expect(
      await countFilesIfDirectoryExists(path.join(temporaryDirectory, 'missing'), () => true),
    ).toBe(0);
  });

  test('counts html files recursively inside an existing adapter output directory', async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const outputRoot = path.join(temporaryDirectory, '.vercel', 'output', 'static');

    await writeTextFile(path.join(outputRoot, 'index.html'), '<html></html>');
    await writeTextFile(path.join(outputRoot, 'courses', 'testing.html'), '<html></html>');
    await writeTextFile(path.join(outputRoot, 'assets', 'styles.css'), 'body {}');

    expect(
      await countFilesIfDirectoryExists(outputRoot, (filePath) => filePath.endsWith('.html')),
    ).toBe(2);
  });
});
