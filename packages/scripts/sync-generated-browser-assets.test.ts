import { afterEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { syncGeneratedAssets } from './sync-generated-browser-assets.ts';

const digest = (content: string): string => createHash('sha256').update(content).digest('hex');

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('sync copies only metadata-listed enhancement files into adapter outputs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  const targetPath = path.join(buildRoot, 'generated/content-enhancements');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(buildRoot, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'current');
  await writeFile(path.join(sourceDirectory, 'chunk-current.js'), 'chunk');
  await writeFile(path.join(sourceDirectory, 'chunk-stale.js'), 'stale');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({
      hash: 'hash',
      files: {
        'chunk-current.js': digest('chunk'),
        'content-enhancements.js': digest('current'),
      },
    })}\n`,
  );

  await syncGeneratedAssets(sourceDirectory, [
    { adapter: 'static', basePath: buildRoot, targetPath },
  ]);

  await expect(readdir(targetPath).then((files) => files.sort())).resolves.toEqual([
    'chunk-current.js',
    'content-enhancements.js',
  ]);
});

test('static mode removes stale Vercel output and syncs static plus SvelteKit client assets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  const clientRoot = path.join(root, '.svelte-kit/output/client');
  const vercelRoot = path.join(root, '.vercel/output');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(buildRoot, { recursive: true });
  await mkdir(clientRoot, { recursive: true });
  await mkdir(path.join(vercelRoot, 'functions/stale.func'), { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'current');
  await writeFile(path.join(vercelRoot, 'functions/stale.func/index.js'), 'stale function');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({
      hash: 'hash',
      files: { 'content-enhancements.js': digest('current') },
    })}
`,
  );

  await syncGeneratedAssets(
    sourceDirectory,
    [
      {
        adapter: 'static',
        basePath: buildRoot,
        targetPath: path.join(buildRoot, 'generated/content-enhancements'),
      },
      {
        adapter: 'client',
        basePath: clientRoot,
        targetPath: path.join(clientRoot, 'generated/content-enhancements'),
      },
      {
        adapter: 'vercel',
        basePath: vercelRoot,
        targetPath: path.join(vercelRoot, 'static/generated/content-enhancements'),
      },
    ],
    'static',
  );

  await expect(
    readFile(
      path.join(buildRoot, 'generated/content-enhancements/content-enhancements.js'),
      'utf8',
    ),
  ).resolves.toBe('current');
  await expect(
    readFile(
      path.join(clientRoot, 'generated/content-enhancements/content-enhancements.js'),
      'utf8',
    ),
  ).resolves.toBe('current');
  await expect(readFile(path.join(vercelRoot, 'functions/stale.func/index.js'))).rejects.toThrow();
});

test('Vercel mode removes stale static output and syncs Vercel plus SvelteKit client assets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  const clientRoot = path.join(root, '.svelte-kit/output/client');
  const vercelRoot = path.join(root, '.vercel/output');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(path.join(buildRoot, 'old'), { recursive: true });
  await mkdir(clientRoot, { recursive: true });
  await mkdir(path.join(vercelRoot, 'static'), { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'current');
  await writeFile(path.join(buildRoot, 'old/index.html'), 'stale static output');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({
      hash: 'hash',
      files: { 'content-enhancements.js': digest('current') },
    })}
`,
  );

  await syncGeneratedAssets(
    sourceDirectory,
    [
      {
        adapter: 'static',
        basePath: buildRoot,
        targetPath: path.join(buildRoot, 'generated/content-enhancements'),
      },
      {
        adapter: 'client',
        basePath: clientRoot,
        targetPath: path.join(clientRoot, 'generated/content-enhancements'),
      },
      {
        adapter: 'vercel',
        basePath: vercelRoot,
        targetPath: path.join(vercelRoot, 'static/generated/content-enhancements'),
      },
    ],
    'vercel',
  );

  await expect(readFile(path.join(buildRoot, 'old/index.html'))).rejects.toThrow();
  await expect(
    readFile(
      path.join(vercelRoot, 'static/generated/content-enhancements/content-enhancements.js'),
      'utf8',
    ),
  ).resolves.toBe('current');
  await expect(
    readFile(
      path.join(clientRoot, 'generated/content-enhancements/content-enhancements.js'),
      'utf8',
    ),
  ).resolves.toBe('current');
});

test('sync rejects path-like metadata filenames', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(buildRoot, { recursive: true });
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({ hash: 'hash', files: { '../escape.js': digest('escape') } })}
`,
  );

  await expect(
    syncGeneratedAssets(sourceDirectory, [
      {
        adapter: 'static',
        basePath: buildRoot,
        targetPath: path.join(buildRoot, 'generated/content-enhancements'),
      },
    ]),
  ).rejects.toThrow('Invalid generated enhancement filename');
});

test('sync preserves inactive adapter output when the selected adapter output is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const staticRoot = path.join(root, 'build');
  const vercelRoot = path.join(root, '.vercel/output');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(staticRoot, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'current');
  await writeFile(path.join(staticRoot, 'index.html'), 'previous static output');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({
      hash: 'hash',
      files: { 'content-enhancements.js': digest('current') },
    })}
`,
  );

  await expect(
    syncGeneratedAssets(
      sourceDirectory,
      [
        {
          adapter: 'static',
          basePath: staticRoot,
          targetPath: path.join(staticRoot, 'generated/content-enhancements'),
        },
        {
          adapter: 'vercel',
          basePath: vercelRoot,
          targetPath: path.join(vercelRoot, 'static/generated/content-enhancements'),
        },
      ],
      'vercel',
    ),
  ).rejects.toThrow('Selected vercel adapter output is missing');
  await expect(readFile(path.join(staticRoot, 'index.html'), 'utf8')).resolves.toBe(
    'previous static output',
  );
});

test('sync rejects invalid metadata digests before adapter outputs are touched', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  const targetPath = path.join(buildRoot, 'generated/content-enhancements');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(targetPath, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'current');
  await writeFile(path.join(targetPath, 'old.js'), 'old adapter output');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({ hash: 'hash', files: { 'content-enhancements.js': 'not-a-digest' } })}
`,
  );

  await expect(
    syncGeneratedAssets(sourceDirectory, [{ adapter: 'static', basePath: buildRoot, targetPath }]),
  ).rejects.toThrow();
  await expect(readFile(path.join(targetPath, 'old.js'), 'utf8')).resolves.toBe(
    'old adapter output',
  );
});

test('sync rejects corrupt source chunks before adapter outputs are touched', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'sync-generated-assets-'));
  directories.push(root);
  const sourceDirectory = path.join(root, 'source');
  const buildRoot = path.join(root, 'build');
  const targetPath = path.join(buildRoot, 'generated/content-enhancements');
  await mkdir(sourceDirectory, { recursive: true });
  await mkdir(targetPath, { recursive: true });
  await writeFile(path.join(sourceDirectory, 'content-enhancements.js'), 'corrupt');
  await writeFile(path.join(targetPath, 'old.js'), 'old adapter output');
  await writeFile(
    path.join(sourceDirectory, '.build-metadata.json'),
    `${JSON.stringify({
      hash: 'hash',
      files: { 'content-enhancements.js': digest('expected') },
    })}
`,
  );

  await expect(
    syncGeneratedAssets(sourceDirectory, [{ adapter: 'static', basePath: buildRoot, targetPath }]),
  ).rejects.toThrow('Generated enhancement digest mismatch');
  await expect(readFile(path.join(targetPath, 'old.js'), 'utf8')).resolves.toBe(
    'old adapter output',
  );
});
