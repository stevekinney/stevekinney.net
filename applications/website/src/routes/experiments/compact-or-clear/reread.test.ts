import { describe, expect, it } from 'vitest';

import type { SourceFile } from '$lib/experiments/dropped-files';

import {
  enterFolder,
  estimateTokens,
  MAXIMUM_FILE_BYTES,
  MAXIMUM_FILES,
  readFileEstimates,
} from './reread';

const source = (path: string, contents: string | Uint8Array): SourceFile => ({
  path,
  file: new File([contents as BlobPart], path.split('/').at(-1) ?? path),
});

describe('estimateTokens', () => {
  it('divides characters by characters per token', () => {
    expect(estimateTokens(100_000, 4)).toBe(25_000);
    expect(estimateTokens(10, 3)).toBe(3);
    expect(estimateTokens(0, 4)).toBe(0);
  });
});

describe('readFileEstimates', () => {
  it('counts characters, not bytes', async () => {
    const { files } = await readFileEstimates([
      source('notes/plain.md', 'a'.repeat(100_000)),
      source('notes/accents.md', 'é'.repeat(10)),
    ]);

    expect(files).toEqual([
      { path: 'notes/plain.md', characters: 100_000 },
      { path: 'notes/accents.md', characters: 10 },
    ]);
  });

  it('skips a file over the size limit without reading it, and says why', async () => {
    const oversized = source('big.log', 'x');
    Object.defineProperty(oversized.file, 'size', { value: MAXIMUM_FILE_BYTES + 1 });
    let read = false;
    oversized.file.arrayBuffer = () => {
      read = true;

      return Promise.resolve(new ArrayBuffer(0));
    };

    const { files, skipped } = await readFileEstimates([oversized]);

    expect(files).toEqual([]);
    expect(skipped).toEqual([{ path: 'big.log', reason: '2.0 MB, over the 2.0 MB limit' }]);
    expect(read).toBe(false);
  });

  it('skips a binary file by its extension or by a zero byte', async () => {
    const { files, skipped } = await readFileEstimates([
      source('logo.png', 'not really a png'),
      source('mystery', new Uint8Array([104, 105, 0, 33])),
      source('readme.md', 'hello'),
    ]);

    expect(files.map((file) => file.path)).toEqual(['readme.md']);
    expect(skipped).toEqual([
      { path: 'logo.png', reason: 'a binary file' },
      { path: 'mystery', reason: 'a binary file' },
    ]);
  });

  it('skips text that is not valid UTF-8', async () => {
    const { skipped } = await readFileEstimates([
      source('latin1.txt', new Uint8Array([0xff, 0xfe, 0x41, 0x80])),
    ]);

    expect(skipped).toEqual([{ path: 'latin1.txt', reason: 'couldn’t be read as text' }]);
  });

  it('stops reading past the file limit', async () => {
    const sources = Array.from({ length: MAXIMUM_FILES + 3 }, (_, index) =>
      source(`f${index}.txt`, 'a'),
    );
    const { files, skipped } = await readFileEstimates(sources);

    expect(files).toHaveLength(MAXIMUM_FILES);
    expect(skipped).toHaveLength(3);
    expect(skipped[0].reason).toContain('file limit');
  });

  it('reads an empty file as zero characters', async () => {
    const { files } = await readFileEstimates([source('empty.txt', '')]);

    expect(files).toEqual([{ path: 'empty.txt', characters: 0 }]);
  });
});

describe('enterFolder', () => {
  it('skips folders that hold generated files', () => {
    expect(enterFolder('project/node_modules')).toBe(false);
    expect(enterFolder('project/.git')).toBe(false);
    expect(enterFolder('project/src')).toBe(true);
    expect(enterFolder('project')).toBe(true);
  });
});
