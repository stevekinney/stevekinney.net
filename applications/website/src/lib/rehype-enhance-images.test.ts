import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { Element, Root } from 'hast';
import { afterEach, describe, expect, it } from 'vitest';
import { VFile } from 'vfile';

import rehypeEnhanceImages from '@stevekinney/markdown/rehype-enhance-images';
import type { ImageManifest } from '@stevekinney/utilities/image-manifest';

const temporaryDirectories: string[] = [];
const markdownFile = path.join(process.cwd(), 'writing', 'test-image.md');
const manifestKey = (filename: string): string =>
  path
    .relative(
      path.resolve(process.cwd(), '..', '..'),
      path.resolve(path.dirname(filename), 'assets'),
    )
    .split(path.sep)
    .concat('')
    .join('/')
    .replace(/\/$/, '');

const manifestEntry = (overrides: Record<string, unknown> = {}) => ({
  hash: '0123456789abcdef',
  width: 100,
  height: 80,
  original: 'https://example.com/image.png',
  avif: [],
  lqip: null,
  videoMimeType: null,
  ...overrides,
});

const transform = async (
  manifestPath: string,
  node: Element,
  strictManifest = true,
): Promise<Element> => {
  const tree: Root = {
    type: 'root',
    children: [{ type: 'element', tagName: 'div', properties: {}, children: [node] }],
  };
  const pluginFactory = rehypeEnhanceImages as unknown as (options: {
    manifestPath: string;
    strictManifest: boolean;
  }) => (tree: Root, file: VFile) => void;
  const transformer = pluginFactory({ manifestPath, strictManifest });
  transformer(tree, new VFile({ path: markdownFile }));
  const parent = tree.children[0];
  if (parent?.type !== 'element') throw new Error('Expected parent element.');
  const result = parent.children[0];
  if (result?.type !== 'element') throw new Error('Expected enhanced element.');
  return result;
};

const writeManifest = async (manifestPath: string, images: ImageManifest['images']) => {
  await writeFile(manifestPath, JSON.stringify({ version: 1, images }));
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('rehypeEnhanceImages', () => {
  it('preserves absent, boolean, and string controls values on videos', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
    temporaryDirectories.push(directory);
    const manifestPath = path.join(directory, 'manifest.json');
    const images = {
      [`${manifestKey(markdownFile)}/video.mp4`]: manifestEntry({ videoMimeType: 'video/mp4' }),
    };
    await writeManifest(manifestPath, images);

    for (const [controls, expected] of [
      [undefined, true],
      [true, true],
      [false, false],
      ['controls', true],
    ] as const) {
      const properties = controls === undefined ? {} : { controls };
      const result = await transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/video.mp4', ...properties },
        children: [],
      });
      expect(result.properties.controls).toBe(expected);
    }
  });

  it('reloads a changed manifest and does not cache permissive failures', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
    temporaryDirectories.push(directory);
    const manifestPath = path.join(directory, 'manifest.json');
    await writeManifest(manifestPath, {});
    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/image.png' },
        children: [],
      }),
    ).rejects.toThrow('Missing image manifest entry');

    await writeManifest(manifestPath, {
      [`${manifestKey(markdownFile)}/image.png`]: manifestEntry(),
    });
    await utimes(manifestPath, new Date(), new Date(Date.now() + 2000));
    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/image.png' },
        children: [],
      }),
    ).resolves.toMatchObject({
      tagName: 'img',
      properties: { src: 'https://example.com/image.png' },
    });
  });

  it('recovers from a permissive malformed read when strict mode is enabled later', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
    temporaryDirectories.push(directory);
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, '{ malformed');
    await expect(
      transform(
        manifestPath,
        {
          type: 'element',
          tagName: 'img',
          properties: { src: 'assets/image.png' },
          children: [],
        },
        false,
      ),
    ).resolves.toMatchObject({ properties: { src: `/${manifestKey(markdownFile)}/image.png` } });
    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/image.png' },
        children: [],
      }),
    ).rejects.toThrow('Image manifest is required');
  });

  it('reloads changed contents even when mtime and size are preserved', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
    temporaryDirectories.push(directory);
    const manifestPath = path.join(directory, 'manifest.json');
    const first = manifestEntry({ original: 'https://example.com/first.png' });
    const second = manifestEntry({ original: 'https://example.com/second.png' });
    const images = { [`${manifestKey(markdownFile)}/image.png`]: first };
    await writeManifest(manifestPath, images);
    const originalStat = await stat(manifestPath);
    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/image.png' },
        children: [],
      }),
    ).resolves.toMatchObject({ properties: { src: first.original } });
    await writeManifest(manifestPath, { [`${manifestKey(markdownFile)}/image.png`]: second });
    await utimes(manifestPath, originalStat.atime, originalStat.mtime);
    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/image.png' },
        children: [],
      }),
    ).resolves.toMatchObject({ properties: { src: second.original } });
  });
});
