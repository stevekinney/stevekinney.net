import { describe, expect, it } from 'vitest';

import {
  defaultMaximumBytes,
  describeSkip,
  formatBytes,
  hasBinaryExtension,
  isDependencyFolder,
  readCharacters,
  readSources,
} from './file-intake';

const textFile = (name: string, contents: string | Uint8Array): File =>
  new File([contents as BlobPart], name);

describe('isDependencyFolder', () => {
  it('matches the last segment of a folder path', () => {
    expect(isDependencyFolder('project/node_modules')).toBe(true);
    expect(isDependencyFolder('project/src/dist')).toBe(true);
    expect(isDependencyFolder('node_modules')).toBe(true);
  });

  it('leaves ordinary folders alone', () => {
    expect(isDependencyFolder('project/src')).toBe(false);
    expect(isDependencyFolder('project/distribution')).toBe(false);
  });
});

describe('hasBinaryExtension', () => {
  it('knows images, archives, and fonts', () => {
    expect(hasBinaryExtension('a/logo.PNG')).toBe(true);
    expect(hasBinaryExtension('bundle.tar.gz')).toBe(true);
    expect(hasBinaryExtension('font.woff2')).toBe(true);
  });

  it('does not guess at source or text', () => {
    expect(hasBinaryExtension('notes.md')).toBe(false);
    expect(hasBinaryExtension('Makefile')).toBe(false);
    expect(hasBinaryExtension('.png')).toBe(false);
  });
});

describe('readCharacters', () => {
  it('counts the characters of a text file', async () => {
    const file = textFile('a.txt', 'a'.repeat(400_000));

    expect(await readCharacters(file, 'a.txt', defaultMaximumBytes)).toEqual({
      kind: 'text',
      characters: 400_000,
    });
  });

  it('counts a multi-byte character once, not once per byte', async () => {
    const file = textFile('a.txt', 'héllo wörld');

    expect(await readCharacters(file, 'a.txt', defaultMaximumBytes)).toEqual({
      kind: 'text',
      characters: 11,
    });
  });

  it('counts a character split across chunks once', async () => {
    const bytes = new TextEncoder().encode('é'.repeat(50_000));
    const file = textFile('a.txt', bytes);

    expect(await readCharacters(file, 'a.txt', defaultMaximumBytes)).toEqual({
      kind: 'text',
      characters: 50_000,
    });
  });

  it('treats an empty file as zero characters', async () => {
    expect(await readCharacters(textFile('a.txt', ''), 'a.txt', defaultMaximumBytes)).toEqual({
      kind: 'text',
      characters: 0,
    });
  });

  it('skips a file with a NUL byte as binary', async () => {
    const file = textFile('data', new Uint8Array([104, 105, 0, 1, 2]));

    expect(await readCharacters(file, 'data', defaultMaximumBytes)).toEqual({
      kind: 'skipped',
      reason: 'binary',
    });
  });

  it('skips a known binary type without reading it', async () => {
    const file = {
      name: 'logo.png',
      size: 10,
      stream: () => {
        throw new Error('should not be read');
      },
    };

    expect(await readCharacters(file as never, 'logo.png', defaultMaximumBytes)).toEqual({
      kind: 'skipped',
      reason: 'binary',
    });
  });

  it('skips a file over the size cap without reading it', async () => {
    const file = {
      name: 'big.log',
      size: 5_000,
      stream: () => {
        throw new Error('should not be read');
      },
    };

    expect(await readCharacters(file as never, 'big.log', 1_000)).toEqual({
      kind: 'skipped',
      reason: 'too-large',
    });
  });

  it('reports a file that fails mid-read as unreadable', async () => {
    const file = {
      name: 'a.txt',
      size: 10,
      stream: () => {
        throw new Error('permission denied');
      },
    };

    expect(await readCharacters(file as never, 'a.txt', defaultMaximumBytes)).toEqual({
      kind: 'skipped',
      reason: 'unreadable',
    });
  });
});

describe('readSources', () => {
  it('splits files from skipped entries and keeps the paths', async () => {
    const result = await readSources(
      [
        { file: textFile('a.ts', 'abcd'), path: 'src/a.ts' },
        { file: textFile('logo.png', 'x'), path: 'src/logo.png' },
        { file: textFile('empty.md', ''), path: 'empty.md' },
      ],
      defaultMaximumBytes,
    );

    expect(result.files.map((entry) => [entry.path, entry.characters, entry.selected])).toEqual([
      ['src/a.ts', 4, true],
      ['empty.md', 0, true],
    ]);
    expect(result.skipped).toEqual([{ path: 'src/logo.png', reason: 'binary', bytes: 1 }]);
  });

  it('reports progress and handles thousands of small files', async () => {
    const sources = Array.from({ length: 3_000 }, (_, index) => ({
      file: textFile(`f${index}.txt`, 'hello'),
      path: `many/f${index}.txt`,
    }));
    const progress: number[] = [];
    const started = performance.now();

    const result = await readSources(sources, defaultMaximumBytes, (done) => progress.push(done));

    expect(result.files).toHaveLength(3_000);
    expect(progress.at(-1)).toBe(3_000);
    expect(performance.now() - started).toBeLessThan(5_000);
  });
});

describe('describeSkip', () => {
  it('gives each reason in words', () => {
    expect(describeSkip({ path: 'a', reason: 'binary', bytes: 1 }, 1024)).toBe('Binary file');
    expect(describeSkip({ path: 'a', reason: 'too-large', bytes: 5000 }, 2 * 1024 * 1024)).toBe(
      'Over the 2 MB size cap',
    );
    expect(describeSkip({ path: 'a/', reason: 'dependency-folder', bytes: null }, 1)).toContain(
      'Dependency',
    );
  });

  it('formats sizes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3 MB');
  });
});
