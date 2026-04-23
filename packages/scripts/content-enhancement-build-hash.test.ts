import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  computeContentEnhancementBuildHash,
  listContentEnhancementBuildHashInputs,
} from './content-enhancement-build-hash.ts';

let temporaryRoot: string;
let packageRoot: string;

const writeTextFile = async (filePath: string, contents: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
};

describe('content enhancement build hash', () => {
  beforeEach(async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'content-enhancement-hash-'));
    packageRoot = path.join(temporaryRoot, 'packages', 'content-enhancements');

    await writeTextFile(path.join(temporaryRoot, 'package.json'), '{"dependencies":{}}\n');
    await writeTextFile(path.join(temporaryRoot, 'bun.lock'), 'lockfile v1\n');
    await writeTextFile(
      path.join(packageRoot, 'package.json'),
      '{"name":"content-enhancements"}\n',
    );
    await writeTextFile(path.join(packageRoot, 'tsconfig.json'), '{"compilerOptions":{}}\n');
    await writeTextFile(path.join(packageRoot, 'src', 'content-enhancements.ts'), 'export {};\n');
  });

  afterEach(async () => {
    await rm(temporaryRoot, { recursive: true, force: true });
  });

  test('includes package source assets and dependency files in a stable order', async () => {
    await writeTextFile(path.join(packageRoot, 'src', 'theme.css'), '.copy { color: green; }\n');

    const inputKeys = (await listContentEnhancementBuildHashInputs(packageRoot, temporaryRoot)).map(
      (input) => input.cacheKey,
    );

    expect(inputKeys).toEqual([
      'content-enhancements/package.json',
      'content-enhancements/src/content-enhancements.ts',
      'content-enhancements/src/theme.css',
      'content-enhancements/tsconfig.json',
      'repository/bun.lock',
      'repository/package.json',
    ]);
  });

  test('changes when package assets or dependency files change', async () => {
    const initialHash = await computeContentEnhancementBuildHash(packageRoot, temporaryRoot);

    await writeTextFile(path.join(packageRoot, 'src', 'theme.css'), '.copy { color: green; }\n');
    const assetHash = await computeContentEnhancementBuildHash(packageRoot, temporaryRoot);

    await writeTextFile(path.join(temporaryRoot, 'bun.lock'), 'lockfile v2\n');
    const lockfileHash = await computeContentEnhancementBuildHash(packageRoot, temporaryRoot);

    expect(assetHash).not.toBe(initialHash);
    expect(lockfileHash).not.toBe(assetHash);
  });
});
