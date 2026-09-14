import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mdsvex } from 'mdsvex';
import type { Code, Heading, Html, Root } from 'mdast';
import { compile, preprocess } from 'svelte/compiler';
import { VFile } from 'vfile';
import remarkTailwindPlayground from '@stevekinney/markdown/remark-tailwind-playground';
import { playgroundFingerprint } from '@stevekinney/utilities/tailwind-playground-metadata';
import type { PlaygroundManifest } from '@stevekinney/utilities/tailwind-playground-types';
import websiteConfig from '../../svelte.config';

type Transform = (tree: Root, file: VFile) => void;
const testDirectory = path.dirname(new URL(import.meta.url).pathname);
const repositoryRoot = path.resolve(testDirectory, '../../../..');

const makeTree = (lang: string, meta: string | null, value: string): Root => ({
  type: 'root',
  children: [{ type: 'code', lang, meta, value } as Code],
});

const htmlNodes = (tree: Root): Html[] =>
  tree.children.filter((child): child is Html => child.type === 'html');

let temporaryDirectory: string;
let manifestPath: string;
let sourcePath: string;

const manifestFiles = {
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html':
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.css':
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
};

const writeManifest = async (
  examples: PlaygroundManifest['examples'],
  files: PlaygroundManifest['files'] = manifestFiles,
): Promise<void> => {
  const manifest: PlaygroundManifest = {
    version: 1,
    examples,
    files,
    configurationCount: 1,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
};

const transformWithManifest = (): Transform =>
  remarkTailwindPlayground({ manifestPath, workspaceRoot: temporaryDirectory }) as Transform;

const preprocessWithManifest = async (content: string): Promise<string> => {
  await writeFile(sourcePath, content);
  const preprocessor = mdsvex({
    extensions: ['.md'],
    remarkPlugins: [
      [remarkTailwindPlayground, { manifestPath, workspaceRoot: temporaryDirectory }],
    ] as never,
  });
  const processed = await preprocessor.markup({ content, filename: sourcePath });
  return processed?.code ?? '';
};

const run = (tree: Root, transform = transformWithManifest()): Root => {
  transform(tree, new VFile({ path: sourcePath }));
  return tree;
};

type ExampleOverrides = Partial<PlaygroundManifest['examples'][number]> & {
  css?: string;
  computedTitle?: string;
  meta?: string;
};

const example = (
  ordinal: number,
  code: string,
  overrides: ExampleOverrides = {},
): PlaygroundManifest['examples'][number] => {
  const {
    css = '',
    computedTitle = overrides.title ?? `Example ${ordinal + 1}`,
    meta = 'tailwind height=192',
    ...entryOverrides
  } = overrides;
  return {
    sourcePath: 'lesson.md',
    ordinal,
    sourceFingerprint: playgroundFingerprint(code, meta, { css, title: computedTitle }),
    height: 192,
    theme: 'light',
    title: computedTitle,
    src: '/generated/playgrounds/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html',
    cssSrc:
      '/generated/playgrounds/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.css',
    ...entryOverrides,
  };
};

describe('remarkTailwindPlayground', () => {
  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'remark-tailwind-playground-'));
    sourcePath = path.join(temporaryDirectory, 'lesson.md');
    manifestPath = path.join(temporaryDirectory, 'manifest.json');
    await mkdir(path.dirname(manifestPath), { recursive: true });
  });

  afterEach(async () => {
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('wraps a tailwind code block with a static iframe figure', async () => {
    const code = '<button class="bg-blue-600">Button</button>';
    await writeManifest([
      example(0, code, {
        computedTitle: 'Building a Button preview',
        meta: 'tailwind height=192 title="Building a Button preview"',
      }),
    ]);

    const tree = run(
      makeTree('html', 'tailwind height=192 title="Building a Button preview"', code),
    );

    expect(tree.children).toHaveLength(3);
    expect(tree.children[0].type).toBe('html');
    expect(tree.children[1].type).toBe('code');
    expect(tree.children[2].type).toBe('html');

    const [opening, closing] = htmlNodes(tree);
    expect(opening.value).toContain('<figure class="tailwind-playground not-prose"');
    expect(opening.value).toContain('data-tailwind-playground');
    expect(opening.value).toContain('title="Building a Button preview"');
    expect(opening.value).toContain(
      'src="/generated/playgrounds/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.html"',
    );
    expect(opening.value).toContain('sandbox="allow-forms"');
    expect(opening.value).toContain('height="192"');
    expect(opening.value).toContain('loading="eager"');
    expect(opening.value).toContain('--tailwind-playground-height:192px');
    expect(opening.value).not.toContain('>CSS</a>');
    expect(closing.value).toBe('</figure>');
  });

  it('preprocesses real course files whose generated heading titles contain apostrophes', async () => {
    const files = [
      'courses/tailwind/building-a-card-list.md',
      'courses/tailwind/building-a-card.md',
      'courses/tailwind/flexbox-aligning-individual-items.md',
      'courses/tailwind/color-mix.md',
    ];

    if (!websiteConfig.preprocess) throw new Error('Expected configured preprocessors.');

    for (const file of files) {
      const filename = path.resolve(repositoryRoot, file);
      await expect(
        preprocess(await readFile(filename, 'utf8'), websiteConfig.preprocess, { filename }),
      ).resolves.toBeTruthy();
    }
  });

  it('encodes Svelte-sensitive title characters before mdsvex compiles emitted HTML', async () => {
    const title = 'Literal {count} `tick`';
    const meta = 'tailwind height=192 title="Literal {count} `tick`"';
    const code = '<button>Button</button>';
    await writeManifest([example(0, code, { computedTitle: title, meta })]);

    const preprocessor = mdsvex({
      extensions: ['.md'],
      remarkPlugins: [
        [remarkTailwindPlayground, { manifestPath, workspaceRoot: temporaryDirectory }],
      ] as never,
    });
    const processed = await preprocessor.markup({
      content: `~~~html ${meta}
${code}
~~~`,
      filename: sourcePath,
    });

    expect(processed?.code).toContain('Literal &#123;count&#125; &#96;tick&#96;');
    expect(() =>
      compile(processed?.code ?? '', { filename: sourcePath, generate: 'server' }),
    ).not.toThrow();
  });

  it.each([
    [
      'single quoted titles',
      "tailwind height=192 title='A single quoted title'",
      'A single quoted title',
    ],
    [
      'escaped quotes in titles',
      String.raw`tailwind height=192 title="A \"quoted\" title"`,
      'A "quoted" title',
    ],
  ])('renders %s from real mdsvex metadata', async (_, meta, title) => {
    const code = '<button>Button</button>';
    await writeManifest([example(0, code, { computedTitle: title, meta })]);

    const processed = await preprocessWithManifest(`~~~html ${meta}\n${code}\n~~~\n`);

    expect(processed).toContain(
      `<span class="tailwind-playground__title">${title.replaceAll('"', '&quot;')}</span>`,
    );
  });

  it('rejects stale manifests when linked CSS changes', async () => {
    const code = '<button class="button">Save</button>';
    await writeManifest([
      example(0, code, { css: '.button { color: red; }', meta: 'tailwind height=192 css=brand' }),
    ]);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'css',
          meta: 'playground=brand',
          value: '.button { color: blue; }',
        } as Code,
        { type: 'code', lang: 'html', meta: 'tailwind height=192 css=brand', value: code } as Code,
      ],
    };

    expect(() => run(tree)).toThrow(/manifest is stale/);
  });

  it('rejects stale manifests when generated heading titles change', async () => {
    const code = '<button>Save</button>';
    await writeManifest([example(0, code, { computedTitle: 'Old Heading — Example 1' })]);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'heading',
          depth: 2,
          position: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 15, offset: 14 },
          },
          children: [{ type: 'text', value: 'New Heading' }],
        } as Heading,
        {
          type: 'code',
          lang: 'html',
          meta: 'tailwind height=192',
          value: code,
          position: {
            start: { line: 3, column: 1, offset: 16 },
            end: { line: 5, column: 4, offset: 60 },
          },
        } as Code,
      ],
    };

    expect(() => run(tree)).toThrow(/manifest is stale/);
  });

  it.each([
    ['named character references', 'A &amp; B', 'A & B'],
    ['numeric character references', 'A &#38; B', 'A & B'],
    ['encoded quotes', 'A &quot;B&quot;', 'A "B"'],
    ['escaped punctuation', String.raw`A \! B`, 'A ! B'],
    ['inline heading formatting', '**A** `&` _B_', 'A & B'],
    ['reference image alt text', 'A ![B][image] C', 'A B C'],
    ['authored curly apostrophes', 'A ’ B', 'A ’ B'],
    ['authored curly quotes', 'A “B”', 'A “B”'],
    ['literal three dots', 'A ... B', 'A ... B'],
    ['literal double dashes', 'A -- B', 'A -- B'],
    ['literal triple dashes', 'A --- B', 'A --- B'],
  ])('uses canonical heading text for %s through mdsvex', async (_, heading, titleText) => {
    const code = '<button>Button</button>';
    const meta = 'tailwind height=192';
    const definition = heading.includes('[image]') ? '\n[image]: /image.png\n' : '';
    const content = `## ${heading}\n\n~~~html ${meta}\n${code}\n~~~\n${definition}`;
    const title = `${titleText} — Example 1`;
    await writeManifest([example(0, code, { computedTitle: title, meta })]);

    const escapedTitle = title.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    await expect(preprocessWithManifest(content)).resolves.toContain(`title="${escapedTitle}"`);
  });

  it('rejects stale manifests when a decoded mdsvex heading title changes', async () => {
    const code = '<button>Button</button>';
    const meta = 'tailwind height=192';
    const content = `## A &amp; B\n\n~~~html ${meta}\n${code}\n~~~\n`;
    await writeManifest([example(0, code, { computedTitle: 'A & C — Example 1', meta })]);

    await expect(preprocessWithManifest(content)).rejects.toThrow(/fingerprint changed/);
  });

  it('keeps later playground iframes lazy loaded', async () => {
    const first = '<div>First</div>';
    const second = '<div>Second</div>';
    await writeManifest(
      [
        example(0, first),
        example(1, second, {
          src: '/generated/playgrounds/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.html',
        }),
      ],
      {
        ...manifestFiles,
        'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.html':
          'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      },
    );

    const tree: Root = {
      type: 'root',
      children: [
        { type: 'code', lang: 'html', meta: 'tailwind height=192', value: first } as Code,
        { type: 'code', lang: 'html', meta: 'tailwind height=192', value: second } as Code,
      ],
    };

    run(tree);

    const playgrounds = htmlNodes(tree).filter((node) => node.value.includes('<figure'));
    expect(playgrounds).toHaveLength(2);
    expect(playgrounds[0].value).toContain('loading="eager"');
    expect(playgrounds[1].value).toContain('loading="lazy"');
  });

  it('links authored CSS anchors before named CSS fences', async () => {
    await writeManifest([]);
    const tree = makeTree('css', 'playground=button-theme', '.button {}');

    run(tree);

    const [anchor] = htmlNodes(tree);
    expect(anchor.value).toBe('<span id="playground-css-button-theme"></span>');
  });

  it('links to authored CSS anchors from the preview toolbar', async () => {
    const code = '<button>Button</button>';
    await writeManifest([example(0, code, { cssAnchor: 'playground-css-button-theme' })]);

    const tree = run(makeTree('html', 'tailwind height=192', code));
    const [opening] = htmlNodes(tree);

    expect(opening.value).toContain('href="#playground-css-button-theme">CSS</a>');
  });

  it('renders explicit dark-theme playgrounds with a dark iframe color scheme', async () => {
    const code = '<button>Button</button>';
    await writeManifest([
      example(0, code, {
        meta: 'tailwind height=192 theme=dark',
        theme: 'dark',
      }),
    ]);

    const tree = run(makeTree('html', 'tailwind height=192 theme=dark', code));
    const [opening] = htmlNodes(tree);

    expect(opening.value).toContain('color-scheme:dark');
  });

  it('finds playground code blocks nested below the root node', async () => {
    const code = '<button>Nested</button>';
    await writeManifest([example(0, code)]);
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [
            { type: 'code', lang: 'html', meta: 'tailwind height=192', value: code } as Code,
          ],
        },
      ],
    };

    run(tree);

    const quote = tree.children[0];
    if (!('children' in quote)) throw new Error('Expected blockquote children.');
    expect(quote.children.map((child) => child.type)).toEqual(['html', 'code', 'html']);
  });

  it('rejects manifest entries without canonical generated document URLs', async () => {
    const code = '<button>Button</button>';
    await writeManifest([example(0, code, { src: 'abc123.html' })]);

    expect(() => run(makeTree('html', 'tailwind height=192', code))).toThrow(
      /Invalid Tailwind playground document URL/,
    );
  });

  it('rejects manifest entries that reference assets missing from manifest files', async () => {
    const code = '<button>Button</button>';
    await writeManifest([example(0, code)], {});

    expect(() => run(makeTree('html', 'tailwind height=192', code))).toThrow(
      /missing generated asset/,
    );
  });

  it('fails when the manifest is stale', async () => {
    const code = '<div>Current</div>';
    await writeManifest([example(0, '<div>Old</div>')]);

    expect(() => run(makeTree('html', 'tailwind height=192', code))).toThrow(/manifest is stale/);
  });

  it('ignores code blocks without tailwind meta', async () => {
    await writeManifest([]);
    const tree = run(makeTree('html', null, '<div>Ignored</div>'));

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('code');
  });

  it('skips non-.md files before reading the manifest', () => {
    const tree = makeTree('html', 'tailwind height=192', '<div>Hello</div>');
    const transform = transformWithManifest();
    transform(tree, new VFile({ path: path.join(temporaryDirectory, 'test.svelte') }));

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].type).toBe('code');
  });
});
