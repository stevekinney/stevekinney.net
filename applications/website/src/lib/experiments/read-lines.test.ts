import { describe, expect, it } from 'vitest';

import { readLines } from './read-lines';

const encoder = new TextEncoder();

type Bytes = Uint8Array<ArrayBuffer>;

/** A stream that delivers exactly the given chunks, so tests control where boundaries fall. */
const streamOf = (...chunks: (string | Bytes)[]): ReadableStream<Bytes> =>
  new ReadableStream<Bytes>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }

      controller.close();
    },
  });

const linesOf = async (stream: ReadableStream<Bytes>): Promise<string[]> => {
  const lines: string[] = [];
  await readLines(stream, (line) => lines.push(line));

  return lines;
};

describe('readLines', () => {
  it('joins a line that spans several chunks', async () => {
    await expect(linesOf(streamOf('{"a":', '1}\n{"b"', ':2}\n'))).resolves.toEqual([
      '{"a":1}',
      '{"b":2}',
    ]);
  });

  it('emits a final line that has no trailing newline', async () => {
    await expect(linesOf(streamOf('first\nsecond'))).resolves.toEqual(['first', 'second']);
  });

  it('decodes a multi-byte character that is split across chunks', async () => {
    const bytes = encoder.encode('≤200K\n');

    await expect(linesOf(streamOf(bytes.slice(0, 2), bytes.slice(2)))).resolves.toEqual(['≤200K']);
  });

  it('emits several lines from a single chunk and keeps empty lines', async () => {
    await expect(linesOf(streamOf('one\n\ntwo\n'))).resolves.toEqual(['one', '', 'two']);
  });

  it('lets the browser run other tasks while it reads a stream that is already in memory', async () => {
    // An in-memory stream resolves every read as a microtask, which never
    // yields to the event loop on its own. A zero-length work slice makes the
    // reader yield after each chunk, so the timer has to fire before it ends.
    let timerFired = false;
    setTimeout(() => (timerFired = true), 0);

    let firedBeforeLastLine = false;
    await readLines(
      streamOf('one\n', 'two\n', 'three\n'),
      (line) => {
        if (line === 'three') firedBeforeLastLine = timerFired;
      },
      { workSliceMilliseconds: 0 },
    );

    expect(firedBeforeLastLine).toBe(true);
  });
});
