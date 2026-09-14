import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compile, type MdsvexOptions } from 'mdsvex';
import { compile as compileSvelte } from 'svelte/compiler';
import rehypeSlug from 'rehype-slug';
import { expect, it } from 'vitest';
import { normalizeObsidianMarkdown } from '../../../../packages/markdown/src/obsidian-normalization';
import rehypeObsidianIdentifiers, {
  rehypeValidateObsidianIdentifiers,
} from '../../../../packages/markdown/src/rehype-obsidian-identifiers';
import rehypeObsidianMath from '../../../../packages/markdown/src/rehype-obsidian-math';
import rehypeCallouts from '../../../../packages/markdown/src/rehype-callouts';
import rehypeEnhanceImages from '../../../../packages/markdown/src/rehype-enhance-images';
import type { PublicationDocument } from '../../../../packages/markdown/src/obsidian-types';

type Pluggable = NonNullable<MdsvexOptions['rehypePlugins']>[number];
const plugins = [
  rehypeCallouts,
  rehypeObsidianIdentifiers,
  rehypeSlug,
  rehypeObsidianMath,
  rehypeValidateObsidianIdentifiers,
] as Pluggable[];

it('compiles repeated embedded headings, local references, math, and native callouts together', async () => {
  const document: PublicationDocument = {
    sourcePath: 'writing/note.md',
    route: '/note',
    source: '# A **heading**\n\n[Jump](#a-heading)\n\n> [!note]- $\\frac{1}{2}$\n> ==Body==\n',
  };
  const result = normalizeObsidianMarkdown('![[note]]\n\n![[note]]', {
    sourcePath: 'writing/host.md',
    publicationIndex: { documents: [document], attachments: [] },
  });
  expect(result.diagnostics).toEqual([]);
  const compiled = await compile(result.markdown, { rehypePlugins: plugins });
  expect(compiled).toBeDefined();
  compileSvelte(compiled!.code, { generate: 'server' });
  expect(compiled!.code.match(/<details/g)).toHaveLength(2);
  expect(compiled!.code.match(/<mjx-container/g)).toHaveLength(2);
  expect(compiled!.code).not.toContain('data-obsidian-heading');
  expect(compiled!.code).not.toContain('data-obsidian-math');
  const identifiers = [...compiled!.code.matchAll(/<h1 id="([^"]+)"/g)].map((match) => match[1]);
  expect(new Set(identifiers).size).toBe(2);
  for (const identifier of identifiers) expect(compiled!.code).toContain(`href="#${identifier}"`);
});

it('passes nested embedded image dimensions through the host image-manifest pipeline', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'obsidian-render-'));
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(
      manifestPath,
      JSON.stringify({
        version: 1,
        images: {
          'writing/sub/assets/image.png': {
            hash: 'test',
            width: 640,
            height: 480,
            original: 'https://example.com/published.png',
            avif: [],
            lqip: null,
            videoMimeType: null,
          },
        },
      }),
    );
    const documents: PublicationDocument[] = [
      {
        sourcePath: 'writing/sub/note.md',
        route: '/note',
        source: '![[assets/image.png|320x200]]',
      },
    ];
    const result = normalizeObsidianMarkdown('![[sub/note]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: {
        documents,
        attachments: [
          {
            sourcePath: 'writing/sub/assets/image.png',
            url: 'https://example.com/published.png',
            mimeType: 'image/png',
          },
        ],
      },
    });
    expect(result.diagnostics).toEqual([]);
    const compiled = await compile(result.markdown, {
      filename: path.resolve('../..', 'writing/host.md'),
      extensions: ['.md'],
      rehypePlugins: [
        rehypeObsidianIdentifiers as Pluggable,
        [rehypeEnhanceImages, { manifestPath, strictManifest: true }] as unknown as Pluggable,
      ],
    });
    expect(compiled!.code).toContain('src="https://example.com/published.png"');
    expect(compiled!.code).toContain('width="320"');
    expect(compiled!.code).toContain('height="200"');
    expect(compiled!.code).not.toContain('data-obsidian-attachment');
    compileSvelte(compiled!.code, { generate: 'server' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('leaves approved static image URLs alone under a strict image manifest', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'obsidian-render-'));
  try {
    const manifestPath = path.join(directory, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({ version: 1, images: {} }));
    const normalized = normalizeObsidianMarkdown('![[/images/approved.png]]', {
      sourcePath: 'writing/host.md',
      publicationIndex: {
        documents: [],
        attachments: [
          {
            sourcePath: 'applications/website/static/images/approved.png',
            url: '/images/approved.png',
            mimeType: 'image/png',
          },
        ],
      },
    });
    expect(normalized.diagnostics).toEqual([]);
    const compiled = await compile(normalized.markdown, {
      filename: path.resolve('../..', 'writing/host.md'),
      extensions: ['.md'],
      rehypePlugins: [
        rehypeObsidianIdentifiers as Pluggable,
        [rehypeEnhanceImages, { manifestPath, strictManifest: true }] as unknown as Pluggable,
      ],
    });
    expect(compiled!.code).toContain('src="/images/approved.png"');
    compileSvelte(compiled!.code, { generate: 'server' });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects collisions between authored IDs and generated heading IDs', async () => {
  await expect(
    compile('# Heading\n\n<span id="heading"></span>', { rehypePlugins: plugins }),
  ).rejects.toThrow('Duplicate HTML identifier');
});

it('renders repeated embedded footnotes with unique IDs and math in the footnote body', async () => {
  const document: PublicationDocument = {
    sourcePath: 'writing/note.md',
    route: '/note',
    source: 'Text[^a]\n\n[^a]: Footnote with $x^2$ and **formatting**.\n',
  };
  const normalized = normalizeObsidianMarkdown('![[note]]\n\n![[note]]', {
    sourcePath: 'writing/host.md',
    publicationIndex: { documents: [document], attachments: [] },
  });
  expect(normalized.diagnostics).toEqual([]);
  const compiled = await compile(normalized.markdown, { rehypePlugins: plugins });
  expect(compiled!.code).toContain('data-footnotes');
  expect(compiled!.code.match(/<sup>/g)).toHaveLength(2);
  expect(compiled!.code.match(/<mjx-container/g)).toHaveLength(2);
  expect(compiled!.code).toContain('<strong>formatting</strong>');
  expect(compiled!.code).not.toContain('data-obsidian-footnote');
  compileSvelte(compiled!.code, { generate: 'server' });
});
