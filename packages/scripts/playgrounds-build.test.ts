import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PlaygroundDefinition } from '@stevekinney/utilities/tailwind-playground-types';
import { buildPlaygrounds } from './playgrounds-build.ts';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const example = (overrides: Partial<PlaygroundDefinition> = {}): PlaygroundDefinition => ({
  sourcePath: 'courses/tailwind/example.md',
  ordinal: 0,
  line: 1,
  sourceFingerprint: 'source',
  html: '<button class="bg-blue-500 p-4">Save</button>',
  htmlAttributes: {},
  bodyAttributes: {},
  candidates: ['bg-blue-500', 'p-4'],
  height: 100,
  theme: 'light',
  title: 'Example',
  css: '',
  ...overrides,
});

describe('playground artifact build', () => {
  test('invalidates only changed class sets, custom CSS, and base CSS', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'playground-invalidation-'));
    directories.push(directory);
    const baseStylesheetPath = path.join(directory, 'base.css');
    const tailwindCssPath = import.meta.resolve('tailwindcss/index.css').replace(/^file:\/\//, '');
    const base = `@import ${JSON.stringify(tailwindCssPath)} source(none);\n`;
    await writeFile(baseStylesheetPath, base);
    const options = {
      outputDirectory: path.join(directory, 'public'),
      cacheDirectory: path.join(directory, 'cache'),
      baseStylesheetPath,
    };
    const original = example();
    const first = await buildPlaygrounds([original], options);
    const duplicate = await buildPlaygrounds(
      [example({ candidates: ['p-4', 'bg-blue-500', 'p-4'] })],
      options,
    );
    expect(duplicate.metrics.compilations).toBe(0);
    expect(duplicate.manifest).toEqual(first.manifest);
    const sized = await buildPlaygrounds([example({ height: 220 })], options);
    expect(sized.metrics.compilations).toBe(0);
    expect(sized.manifest.examples[0]!.src).toBe(first.manifest.examples[0]!.src);
    const changedClasses = example({ candidates: ['p-4', 'bg-blue-500', 'text-red-500'] });
    const classes = await buildPlaygrounds([changedClasses], options);
    expect(classes.metrics.compilations).toBe(1);
    expect(classes.manifest.examples[0]!.cssSrc).not.toBe(first.manifest.examples[0]!.cssSrc);
    const custom = example({ css: '@theme { --color-blue-500: #123456; }' });
    expect((await buildPlaygrounds([custom], options)).metrics.compilations).toBe(1);
    await writeFile(baseStylesheetPath, `${base}\nbody { padding: 2rem; }\n`);
    const changedBase = await buildPlaygrounds([custom], options);
    expect(changedBase.metrics.compilations).toBe(1);
    expect((await buildPlaygrounds([custom], options)).metrics.compilations).toBe(0);
  });
  test('reuses CSS for text changes and repairs missing or corrupt assets', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'playground-build-'));
    directories.push(directory);
    const options = {
      outputDirectory: path.join(directory, 'public'),
      cacheDirectory: path.join(directory, 'cache'),
    };
    const first = await buildPlaygrounds([example(), example({ ordinal: 1 })], options);
    expect(first.metrics.compilations).toBe(1);
    expect(first.manifest.configurationCount).toBe(1);
    const cssPath = path.join(
      options.outputDirectory,
      path.basename(first.manifest.examples[0]!.cssSrc),
    );
    const css = await readFile(cssPath, 'utf8');
    expect(css).toContain('.bg-blue-500');
    expect(css).not.toContain('black-pearl');
    const timestamp = (await stat(cssPath)).mtimeMs;
    const warm = await buildPlaygrounds([example(), example({ ordinal: 1 })], options);
    expect(warm.metrics.compilations).toBe(0);
    expect(warm.metrics.writes).toBe(0);
    expect((await stat(cssPath)).mtimeMs).toBe(timestamp);
    const edited = example({
      html: '<button class="bg-blue-500 p-4">Changed</button>',
      sourceFingerprint: 'edited',
    });
    const changed = await buildPlaygrounds([edited, example({ ordinal: 1 })], options);
    expect(changed.metrics.compilations).toBe(0);
    expect(changed.manifest.examples[1]!.src).toBe(first.manifest.examples[1]!.src);
    expect(changed.manifest.examples[0]!.src).not.toBe(first.manifest.examples[0]!.src);
    await writeFile(cssPath, 'corrupt');
    const repaired = await buildPlaygrounds([edited, example({ ordinal: 1 })], options);
    expect(repaired.metrics.compilations).toBe(1);
    expect(await readFile(cssPath, 'utf8')).toBe(css);
    await rm(path.join(options.outputDirectory, path.basename(repaired.manifest.examples[0]!.src)));
    const recovered = await buildPlaygrounds([edited, example({ ordinal: 1 })], options);
    expect(recovered.metrics.compilations).toBe(0);
    expect(recovered.metrics.writes).toBe(1);
  });

  test('isolates custom themes and deduplicates configurations by content', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'playground-groups-'));
    directories.push(directory);
    const options = {
      outputDirectory: path.join(directory, 'public'),
      cacheDirectory: path.join(directory, 'cache'),
    };
    const css = '@theme { --color-special: #123456; }';
    const result = await buildPlaygrounds(
      [
        example({ candidates: ['bg-special'] }),
        example({ ordinal: 1, css, candidates: ['bg-special'] }),
        example({ ordinal: 2, css, cssName: 'different-name', candidates: ['bg-special', 'p-8'] }),
      ],
      options,
    );
    expect(result.metrics.compilations).toBe(2);
    expect(result.manifest.examples[1]!.cssSrc).toBe(result.manifest.examples[2]!.cssSrc);
    const readCss = (ordinal: number): Promise<string> =>
      readFile(
        path.join(
          options.outputDirectory,
          path.basename(result.manifest.examples[ordinal]!.cssSrc),
        ),
        'utf8',
      );
    expect(await readCss(0)).not.toContain('.bg-special');
    expect(await readCss(1)).toContain('.bg-special');
    expect(await readCss(1)).toContain('.p-8');
  });
});
