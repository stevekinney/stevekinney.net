import { describe, expect, it } from 'vitest';

import { createLatestRequest } from './latest-request';

/** A promise the test settles by hand, so it controls which request finishes first. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });

  return { promise, resolve, reject };
};

describe('createLatestRequest', () => {
  it('keeps a request current until a newer one starts', () => {
    const requests = createLatestRequest();
    const first = requests.start();
    expect(first()).toBe(true);

    const second = requests.start();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('ignores a slow folder walk that settles after a newer file selection', async () => {
    const requests = createLatestRequest();
    const read: string[][] = [];
    const errors: string[] = [];

    const handle = (files: Promise<string[]>): Promise<void> =>
      requests.follow(
        files,
        (resolved) => read.push(resolved),
        () => errors.push('failed'),
      );

    const folder = deferred<string[]>();
    const failingFolder = deferred<string[]>();
    const folderDone = handle(folder.promise);
    const failingDone = handle(failingFolder.promise);
    const selectionDone = handle(Promise.resolve(['chosen.jsonl']));
    await selectionDone;

    folder.resolve(['folder/a.jsonl', 'folder/b.jsonl']);
    failingFolder.reject(new Error('walk failed'));
    await Promise.all([folderDone, failingDone]);

    expect(read).toEqual([['chosen.jsonl']]);
    expect(errors).toEqual([]);
  });
});
