import { describe, expect, it } from 'vitest';

import { fixtureLines, fixturePaths } from './fixture-reader';
import { isAbortError, isSessionFile, readSessionFiles } from './read-sessions';
import type { ReadProgress } from './read-sessions';

const sourceFiles = () =>
  fixturePaths().map((path) => ({
    path,
    file: new File([fixtureLines(path).join('\n')], path.split('/').at(-1) ?? path),
  }));

describe('readSessionFiles', () => {
  it('streams every file and reports progress up to the total', async () => {
    const progress: ReadProgress[] = [];
    const data = await readSessionFiles(sourceFiles(), {
      onProgress: (update) => progress.push(update),
      progressMilliseconds: 0,
    });

    expect(data.errors).toHaveLength(5);
    expect(progress.at(-1)).toMatchObject({ file: 3, files: 3 });
    expect(progress.at(-1)?.read).toBe(progress.at(-1)?.total);
  });

  it('stops with an abort error when cancelled', async () => {
    const controller = new AbortController();
    const reading = readSessionFiles(sourceFiles(), {
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });

    await expect(reading).rejects.toSatisfy(isAbortError);
  });
});

describe('isSessionFile', () => {
  it('reads only JSON Lines files from a folder', () => {
    expect(isSessionFile('projects/app/session.jsonl')).toBe(true);
    expect(isSessionFile('projects/app/notes.md')).toBe(false);
  });
});
