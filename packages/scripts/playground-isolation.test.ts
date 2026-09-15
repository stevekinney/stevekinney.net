import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PlaygroundDefinition } from '@stevekinney/utilities/tailwind-playground-types';
import { loadMarkdownSource, updateMarkdownSource } from './content-repository/markdown.ts';
import { normalizeObsidianMarkdown } from '@stevekinney/markdown/obsidian-normalization';
import { repositoryRoot } from './content-paths.ts';
import { buildPlaygrounds } from './playgrounds-build.ts';
import { compilerDependencyFingerprint } from './build-dependencies.ts';

const temporaryDirectories: string[] = [];
const arbitraryPlaygroundSentinel = 'bg-[rgb(13_37_99)]';

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

const createTemporaryDirectory = async (prefix: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

const playground = (overrides: Partial<PlaygroundDefinition> = {}): PlaygroundDefinition => ({
  sourcePath: 'courses/tailwind/isolation.md',
  ordinal: 0,
  line: 1,
  sourceFingerprint: 'source',
  html: '<div class="p-4">Example</div>',
  htmlAttributes: {},
  bodyAttributes: {},
  candidates: ['p-4'],
  height: 120,
  theme: 'light',
  title: 'Isolation Example',
  css: '',
  ...overrides,
});

const compileStylesheet = async (inputPath: string, outputPath: string): Promise<string> => {
  const compiler = compilerDependencyFingerprint();
  const child = Bun.spawn(
    ['node', compiler.cliPath, '-i', inputPath, '-o', outputPath, '--minify'],
    {
      stdout: 'pipe',
      stderr: 'pipe',
    },
  );
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exitCode !== 0) {
    throw new Error(`Tailwind compilation failed:\n${stdout}${stderr}`);
  }

  return readFile(outputPath, 'utf8');
};

describe('Tailwind playground compiler isolation', () => {
  test('keeps embedded playground ownership and URL resolution tied to the embedded note', async () => {
    const directory = await mkdtemp(path.join(repositoryRoot, 'tmp/playground-embed-source-'));
    temporaryDirectories.push(directory);
    const targetPath = path.join(directory, 'target.md');
    const hostPath = path.join(directory, 'host.md');
    const frontmatter = (title: string): string =>
      `---\ntitle: ${title}\ndescription: Fixture.\ndate: 2025-01-01\n---\n\n`;
    await Bun.write(
      targetPath,
      `${frontmatter('Target')}\n\`\`\`html tailwind height=120\n<a href="assets/example">Target</a>\n\`\`\`\n`,
    );
    await Bun.write(hostPath, `${frontmatter('Host')}![[target]]\n`);

    const target = await loadMarkdownSource(targetPath);
    const host = await loadMarkdownSource(hostPath);
    const targetSourcePath = path.relative(repositoryRoot, targetPath).split(path.sep).join('/');
    const hostSourcePath = path.relative(repositoryRoot, hostPath).split(path.sep).join('/');
    const publicationIndex = {
      documents: [
        { sourcePath: targetSourcePath, route: '/target', source: target.rawSource },
        { sourcePath: hostSourcePath, route: '/host', source: host.rawSource },
      ],
      attachments: [],
    };
    const normalized = normalizeObsidianMarkdown(host.rawSource, {
      sourcePath: hostSourcePath,
      publicationIndex,
    });
    updateMarkdownSource(host, normalized.markdown);

    expect(target.tailwindPlaygrounds[0]?.sourcePath).toBe(targetSourcePath);
    expect(target.tailwindPlaygrounds[0]?.html).toContain(
      `href="/${path.posix.dirname(targetSourcePath)}/assets/example"`,
    );
    expect(host.tailwindPlaygrounds).toEqual([]);
  });

  test('keeps website theme tokens out of playground utility compilation', async () => {
    const directory = await createTemporaryDirectory('playground-theme-isolation-');
    const siteCss = await compileStylesheet(
      path.join(repositoryRoot, 'applications/website/src/app.css'),
      path.join(directory, 'site.css'),
    );

    expect(siteCss).toContain('--color-black-pearl-50');
    expect(siteCss).toContain('dark\\:bg-black-pearl-950');
    expect(siteCss).not.toContain('rgb(13 37 99)');

    const result = await buildPlaygrounds(
      [
        playground({
          html: `<div class="bg-black-pearl-500 ${arbitraryPlaygroundSentinel} p-4">Example</div>`,
          candidates: ['bg-black-pearl-500', arbitraryPlaygroundSentinel, 'p-4'],
        }),
      ],
      {
        outputDirectory: path.join(directory, 'playgrounds'),
        cacheDirectory: path.join(directory, 'cache'),
      },
    );
    const playgroundCss = await readFile(
      path.join(directory, 'playgrounds', path.basename(result.manifest.examples[0]!.cssSrc)),
      'utf8',
    );

    expect(playgroundCss).not.toContain('.bg-black-pearl-500');
    expect(playgroundCss).not.toContain('black-pearl');
    expect(playgroundCss).toContain('#0d2563');
  });

  test('ignores unrelated website source and theme changes when rebuilding playgrounds', async () => {
    const directory = await createTemporaryDirectory('playground-source-isolation-');
    const options = {
      outputDirectory: path.join(directory, 'playgrounds'),
      cacheDirectory: path.join(directory, 'cache'),
    };
    const examples = [
      playground({
        html: `<div class="${arbitraryPlaygroundSentinel} p-4">Example</div>`,
        candidates: [arbitraryPlaygroundSentinel, 'p-4'],
      }),
    ];

    const first = await buildPlaygrounds(examples, options);
    const cssPath = path.join(
      options.outputDirectory,
      path.basename(first.manifest.examples[0]!.cssSrc),
    );
    const htmlPath = path.join(
      options.outputDirectory,
      path.basename(first.manifest.examples[0]!.src),
    );
    const manifestPath = path.join(options.outputDirectory, 'manifest.json');
    const before = {
      css: (await stat(cssPath)).mtimeMs,
      html: (await stat(htmlPath)).mtimeMs,
      manifest: (await stat(manifestPath)).mtimeMs,
    };

    const websiteStylesheetPath = path.join(repositoryRoot, 'applications/website/src/app.css');
    const websiteStylesheet = await readFile(websiteStylesheetPath, 'utf8');
    let warm: Awaited<ReturnType<typeof buildPlaygrounds>>;
    try {
      await writeFile(
        websiteStylesheetPath,
        `${websiteStylesheet}\n@theme { --color-blue-500: #010203; --color-isolation-sentinel: #abcdef; }\n`,
        'utf8',
      );
      warm = await buildPlaygrounds(examples, options);
    } finally {
      await writeFile(websiteStylesheetPath, websiteStylesheet, 'utf8');
    }
    const after = {
      css: (await stat(cssPath)).mtimeMs,
      html: (await stat(htmlPath)).mtimeMs,
      manifest: (await stat(manifestPath)).mtimeMs,
    };

    expect(warm.metrics.compilations).toBe(0);
    expect(warm.metrics.writes).toBe(0);
    expect(warm.manifest).toEqual(first.manifest);
    expect(after).toEqual(before);
  });

  test('retains raw Markdown HTML candidates for the website stylesheet separately', async () => {
    const directory = await createTemporaryDirectory('markdown-site-candidates-');
    const markdownPath = path.join(directory, 'candidate-example.md');
    await writeFile(
      markdownPath,
      [
        '---',
        'title: Candidate Example',
        'description: Temporary candidate extraction test.',
        'date: 2026-01-01',
        'modified: 2026-01-01',
        '---',
        '',
        `<div class="bg-black-pearl-500 ${arbitraryPlaygroundSentinel} bg-black-pearl-500">Site HTML</div>`,
        'A prose class="text-red-500" token is not HTML.',
        '',
        '```css playground=isolated',
        '@theme { --color-isolated: #123456; }',
        '```',
        '',
        '```html tailwind height=120 css=isolated',
        '<div class="bg-pink-500 bg-isolated">Playground HTML</div>',
        '```',
      ].join('\n'),
      'utf8',
    );

    const source = await loadMarkdownSource(markdownPath);

    expect(source.siteTailwindCandidates).toEqual(
      expect.arrayContaining(['bg-black-pearl-500', arbitraryPlaygroundSentinel]),
    );
    expect(source.tailwindPlaygrounds).toHaveLength(1);
    expect(source.tailwindPlaygrounds[0]!.candidates).toContain('bg-pink-500');
    expect(source.tailwindPlaygrounds[0]!.cssName).toBe('isolated');
    expect(source.siteTailwindCandidates).not.toContain('bg-pink-500');
    expect(source.siteTailwindCandidates).not.toContain('text-red-500');
    expect(
      source.siteTailwindCandidates.filter((candidate) => candidate === 'bg-black-pearl-500'),
    ).toHaveLength(1);

    const built = await buildPlaygrounds(source.tailwindPlaygrounds, {
      outputDirectory: path.join(directory, 'playgrounds'),
      cacheDirectory: path.join(directory, 'cache'),
    });
    const cssPath = path.join(
      directory,
      'playgrounds',
      path.basename(built.manifest.examples[0]!.cssSrc),
    );
    expect(await readFile(cssPath, 'utf8')).toContain('--color-isolated');
  });

  test('tracks Markdown edits through collection and compilation invalidation boundaries', async () => {
    const directory = await createTemporaryDirectory('markdown-invalidation-sequence-');
    const markdownPath = path.join(directory, 'sequence.md');
    const outputDirectory = path.join(directory, 'playgrounds');
    const cacheDirectory = path.join(directory, 'cache');
    const writeFixture = (body: string): Promise<void> =>
      writeFile(
        markdownPath,
        `---\ntitle: Sequence\ndescription: Sequence fixture.\ndate: 2026-01-01\nmodified: 2026-01-01\n---\n\n${body}\n`,
        'utf8',
      );
    const buildFixture = async () => {
      const source = await loadMarkdownSource(markdownPath);
      const built = await buildPlaygrounds(source.tailwindPlaygrounds, {
        outputDirectory,
        cacheDirectory,
      });
      return { source, built };
    };
    await writeFixture('Prose only.');
    const prose = await buildFixture();
    await writeFixture('Prose only with class="text-red-500" in text.');
    const proseWarm = await buildFixture();
    expect(proseWarm.built.metrics.writes).toBe(0);
    expect(proseWarm.built.manifest).toEqual(prose.built.manifest);
    await writeFixture('```html tailwind height=120\n<div class="p-4">Before</div>\n```');
    const initial = await buildFixture();
    await writeFixture('```html tailwind height=120\n<div class="p-4">After</div>\n```');
    const textChanged = await buildFixture();
    expect(textChanged.built.metrics.compilations).toBe(0);
    expect(textChanged.built.manifest.examples[0]!.src).not.toBe(
      initial.built.manifest.examples[0]!.src,
    );
    expect(textChanged.built.manifest.examples[0]!.cssSrc).toBe(
      initial.built.manifest.examples[0]!.cssSrc,
    );
    await writeFixture('```html tailwind height=120\n<div class="p-4 p-4">After</div>\n```');
    const repeatedClass = await buildFixture();
    expect(repeatedClass.built.metrics.compilations).toBe(0);
    expect(repeatedClass.built.manifest.examples[0]!.cssSrc).toBe(
      textChanged.built.manifest.examples[0]!.cssSrc,
    );
    await writeFixture(
      '```html tailwind height=120\n<div class="p-4 text-red-500">After</div>\n```',
    );
    const newClass = await buildFixture();
    expect(newClass.built.metrics.compilations).toBe(1);
    expect(newClass.built.manifest.examples[0]!.cssSrc).not.toBe(
      repeatedClass.built.manifest.examples[0]!.cssSrc,
    );
    await writeFixture(
      '```css playground=brand\n@theme { --color-brand: #123456; }\n```\n\n```html tailwind height=120 css=brand\n<div class="p-4">After</div>\n```',
    );
    const linkedCss = await buildFixture();
    expect(linkedCss.built.metrics.compilations).toBe(1);
    expect(linkedCss.source.tailwindPlaygrounds[0]!.cssName).toBe('brand');
  });
});
