import { mkdtemp, rm, stat, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { Element, Root } from 'hast';
import { compile } from 'mdsvex';
import { parse } from 'svelte/compiler';
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

  it('looks up images whose file names contain encoded reserved characters', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
    temporaryDirectories.push(directory);
    const manifestPath = path.join(directory, 'manifest.json');
    await writeManifest(manifestPath, {
      [`${manifestKey(markdownFile)}/a#b.png`]: manifestEntry(),
    });

    await expect(
      transform(manifestPath, {
        type: 'element',
        tagName: 'img',
        properties: { src: 'assets/a%23b.png' },
        children: [],
      }),
    ).resolves.toBeDefined();
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
  describe('author-written alt and title text', () => {
    const awkwardAlt = 'A "quoted" {value} with `code`';
    const escapedAlt = 'A &quot;quoted&quot; &#123;value&#125; with &#96;code&#96;';

    const imageNode = (properties: Element['properties']): Element => ({
      type: 'element',
      tagName: 'img',
      properties,
      children: [],
    });

    const findImage = (element: Element): Element => {
      if (element.tagName === 'img') return element;
      const image = element.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'img',
      );
      if (!image) throw new Error('Expected an <img> element.');
      return image;
    };

    const writeImageManifest = async (entry: ReturnType<typeof manifestEntry>) => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'rehype-images-'));
      temporaryDirectories.push(directory);
      const manifestPath = path.join(directory, 'manifest.json');
      await writeManifest(manifestPath, { [`${manifestKey(markdownFile)}/image.png`]: entry });
      return manifestPath;
    };

    it('escapes alt and title on images enhanced into a <picture>', async () => {
      const manifestPath = await writeImageManifest(
        manifestEntry({ avif: [{ width: 480, url: 'https://example.com/image.avif' }] }),
      );
      const result = await transform(
        manifestPath,
        imageNode({ src: 'assets/image.png', alt: awkwardAlt, title: 'say "hi"' }),
      );

      expect(result.tagName).toBe('picture');
      expect(findImage(result).properties).toMatchObject({
        alt: escapedAlt,
        title: 'say &quot;hi&quot;',
      });
    });

    it('escapes alt on images enhanced into a plain <img>', async () => {
      const manifestPath = await writeImageManifest(manifestEntry());
      const result = await transform(
        manifestPath,
        imageNode({ src: 'assets/image.png', alt: awkwardAlt }),
      );

      expect(result.tagName).toBe('img');
      expect(result.properties).toMatchObject({ alt: escapedAlt });
    });

    it('escapes alt on images that are missing from the manifest', async () => {
      const manifestPath = await writeImageManifest(manifestEntry());
      const result = await transform(
        manifestPath,
        imageNode({ src: 'assets/not-in-the-manifest.png', alt: awkwardAlt }),
        false,
      );

      expect(result.properties).toMatchObject({ alt: escapedAlt });
    });

    it('escapes alt on external images the plugin otherwise leaves alone', async () => {
      const manifestPath = await writeImageManifest(manifestEntry());
      const result = await transform(
        manifestPath,
        imageNode({ src: 'https://example.com/photo.png', alt: awkwardAlt }),
      );

      expect(result.properties).toMatchObject({
        src: 'https://example.com/photo.png',
        alt: escapedAlt,
      });
    });

    it('leaves ampersands and existing entities alone, so escaping is idempotent', async () => {
      const manifestPath = await writeImageManifest(manifestEntry());
      const alt = 'R&D says &quot;hello&quot;';
      const node = imageNode({ src: 'https://example.com/photo.png', alt });

      await transform(manifestPath, node);
      await transform(manifestPath, node);

      expect(node.properties?.alt).toBe(alt);
    });

    it('produces markup that mdsvex and Svelte compile back to the original text', async () => {
      const manifestPath = await writeImageManifest(
        manifestEntry({ avif: [{ width: 480, url: 'https://example.com/image.avif' }] }),
      );
      const source = `![${awkwardAlt}](assets/image.png 'say "hi"')\n`;

      const compiled = await compile(source, {
        filename: markdownFile,
        extensions: ['.md'],
        // mdsvex bundles an older `unified`, so the plugin's types do not line up.
        rehypePlugins: [[rehypeEnhanceImages, { manifestPath, strictManifest: true }]] as never,
      });
      expect(compiled?.code).toBeDefined();

      // Svelte throws on the unescaped form: `alt="A "quoted" ..."` ends the attribute early.
      const ast = parse(compiled?.code ?? '', { modern: true });
      const texts: Record<string, string> = {};
      const walk = (value: unknown): void => {
        if (Array.isArray(value)) return value.forEach(walk);
        if (typeof value !== 'object' || value === null) return;
        const node = value as Record<string, unknown>;
        if (node.type === 'Attribute' && (node.name === 'alt' || node.name === 'title')) {
          const parts = node.value as Array<{ type: string; data?: string }>;
          texts[node.name as string] = parts.map((part) => part.data ?? `<${part.type}>`).join('');
        }
        Object.values(node).forEach(walk);
      };
      walk(ast);

      expect(texts.alt).toBe(awkwardAlt);
      expect(texts.title).toBe('say "hi"');
    });
  });
});
