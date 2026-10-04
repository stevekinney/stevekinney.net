export type ReadLinesOptions = {
  /** How long to work before letting the browser paint and respond to input. */
  workSliceMilliseconds?: number;
};

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Calls `onLine` for each line in a byte stream without ever holding the whole
 * stream as one string, so a session file of hundreds of megabytes stays
 * readable. Newlines are only searched for in each new chunk, which keeps a
 * single very long line from being rescanned once per chunk.
 *
 * A file that's already in memory resolves every read as a microtask, which
 * never gives the browser a turn: a 579 MB session froze the page for over a
 * second. So after each slice of work, the reader yields for one task.
 */
export const readLines = async (
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  onLine: (line: string) => void,
  { workSliceMilliseconds = 30 }: ReadLinesOptions = {},
): Promise<void> => {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  const pending: string[] = [];
  let sliceStarted = performance.now();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      let start = 0;
      let newline = value.indexOf('\n');

      while (newline !== -1) {
        pending.push(value.slice(start, newline));
        onLine(pending.join(''));
        pending.length = 0;
        start = newline + 1;
        newline = value.indexOf('\n', start);
      }

      if (start < value.length) pending.push(value.slice(start));

      if (performance.now() - sliceStarted >= workSliceMilliseconds) {
        await yieldToEventLoop();
        sliceStarted = performance.now();
      }
    }

    if (pending.length > 0) onLine(pending.join(''));
  } finally {
    reader.releaseLock();
  }
};
