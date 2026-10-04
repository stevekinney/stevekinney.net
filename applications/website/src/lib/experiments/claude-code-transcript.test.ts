import { describe, expect, it } from 'vitest';

import { createTranscriptReader } from './claude-code-transcript';
import type { ClaudeCodeTranscript } from './claude-code-transcript';

const read = (files: Record<string, string[]>): ClaudeCodeTranscript => {
  const reader = createTranscriptReader();

  for (const [name, lines] of Object.entries(files)) {
    const file = reader.readFile(name);
    lines.forEach(file.addLine);
    file.finish();
  }

  return reader.summarize();
};

type Usage = { input?: number; cacheRead?: number; cacheWrite?: number; output?: number };

const usage = ({ input = 0, cacheRead = 0, cacheWrite = 0, output = 0 }: Usage) => ({
  input_tokens: input,
  cache_read_input_tokens: cacheRead,
  cache_creation_input_tokens: cacheWrite,
  output_tokens: output,
});

const response = (
  id: string,
  timestamp: string,
  usageFields: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'session-1',
    timestamp,
    ...extra,
    message: { id, model: 'claude-opus-5-5', role: 'assistant', usage: usageFields },
  });

const compaction = (timestamp: string, preTokens: number, postTokens: number, trigger = 'auto') =>
  JSON.stringify({
    type: 'system',
    subtype: 'compact_boundary',
    sessionId: 'session-1',
    timestamp,
    compactMetadata: { trigger, preTokens, postTokens },
  });

const userLine = (timestamp: string): string =>
  JSON.stringify({ type: 'user', sessionId: 'session-1', timestamp, message: { role: 'user' } });

describe('createTranscriptReader', () => {
  it('keeps the final line of a response that streamed across several lines', () => {
    const transcript = read({
      'session.jsonl': [
        response('message-1', '2026-10-04T10:00:00.000Z', usage({ cacheRead: 900, output: 6 })),
        response('message-1', '2026-10-04T10:00:01.000Z', usage({ cacheRead: 900, output: 243 })),
      ],
    });

    expect(transcript.turns).toHaveLength(1);
    expect(transcript.turns[0]).toMatchObject({ contextTokens: 900, outputTokens: 243 });
  });

  it('counts uncached input, cache reads, and cache writes as context', () => {
    const transcript = read({
      'session.jsonl': [
        response(
          'message-1',
          '2026-10-04T10:00:00.000Z',
          usage({ input: 2, cacheRead: 26_179, cacheWrite: 31_915, output: 84 }),
        ),
      ],
    });

    expect(transcript.turns[0].contextTokens).toBe(58_096);
  });

  it('takes context from the last iteration when an advisor call splits a response', () => {
    // The top-level usage sums both executor iterations, which counts the prompt twice.
    const transcript = read({
      'session.jsonl': [
        response('message-1', '2026-10-04T10:00:00.000Z', {
          ...usage({ input: 4, cacheRead: 220_634, cacheWrite: 4_820, output: 501 }),
          iterations: [
            {
              ...usage({ input: 2, cacheRead: 109_597, cacheWrite: 1_440, output: 221 }),
              type: 'message',
            },
            { ...usage({ input: 112_634, output: 16_212 }), type: 'advisor_message' },
            {
              ...usage({ input: 2, cacheRead: 111_037, cacheWrite: 3_380, output: 280 }),
              type: 'message',
            },
          ],
        }),
      ],
    });

    expect(transcript.turns[0]).toMatchObject({ contextTokens: 114_419, outputTokens: 501 });
  });

  it('leaves subagent and placeholder responses out of the turns', () => {
    const transcript = read({
      'session.jsonl': [
        response('main', '2026-10-04T10:00:00.000Z', usage({ cacheRead: 100 })),
        response('subagent', '2026-10-04T10:00:01.000Z', usage({ cacheRead: 999 }), {
          isSidechain: true,
        }),
        JSON.stringify({
          type: 'assistant',
          sessionId: 'session-1',
          timestamp: '2026-10-04T10:00:02.000Z',
          message: { id: 'placeholder', model: '<synthetic>', usage: usage({}) },
        }),
      ],
    });

    expect(transcript.turns.map((turn) => turn.messageId)).toEqual(['main']);
    expect(transcript.sidechainTurns).toBe(1);
    expect(transcript.files[0]).toMatchObject({ turns: 1, sidechainTurns: 1 });
  });

  it('records compactions and separates the turns on either side of one', () => {
    const transcript = read({
      'session.jsonl': [
        response('before', '2026-10-04T10:00:00.000Z', usage({ cacheRead: 312_000 })),
        compaction('2026-10-04T10:05:00.000Z', 312_693, 12_969, 'manual'),
        response('after', '2026-10-04T10:06:00.000Z', usage({ cacheRead: 20_000 })),
      ],
    });

    expect(transcript.compactions).toEqual([
      {
        sessionId: 'session-1',
        timestamp: '2026-10-04T10:05:00.000Z',
        trigger: 'manual',
        preTokens: 312_693,
        postTokens: 12_969,
        file: 'session.jsonl',
      },
    ]);
    expect(transcript.turns.map((turn) => turn.segment)).toEqual([0, 1]);
  });

  it('orders turns from several files by time and counts a shared response once', () => {
    const shared = response('shared', '2026-10-04T09:00:00.000Z', usage({ cacheRead: 50 }));

    const transcript = read({
      'later.jsonl': [response('late', '2026-10-04T11:00:00.000Z', usage({ cacheRead: 300 }))],
      'earlier.jsonl': [
        shared,
        response('early', '2026-10-04T10:00:00.000Z', usage({ cacheRead: 200 })),
      ],
      'copy.jsonl': [shared],
    });

    expect(transcript.turns.map((turn) => turn.messageId)).toEqual(['shared', 'early', 'late']);
  });

  it('reports the first and last record times, including records after the last response', () => {
    const transcript = read({
      'session.jsonl': [
        userLine('2026-10-04T08:59:00.000Z'),
        response('message-1', '2026-10-04T09:00:00.000Z', usage({ cacheRead: 100 })),
        userLine('2026-10-04T11:14:00.000Z'),
        JSON.stringify({ type: 'last-prompt', sessionId: 'session-1' }),
      ],
    });

    expect(transcript.firstTimestamp).toBe('2026-10-04T08:59:00.000Z');
    expect(transcript.lastTimestamp).toBe('2026-10-04T11:14:00.000Z');
  });

  it('counts an unfinished last line as skipped and keeps everything else', () => {
    const complete = response('message-1', '2026-10-04T09:00:00.000Z', usage({ cacheRead: 100 }));

    const transcript = read({ 'session.jsonl': [complete, complete.slice(0, -12), 'not json'] });

    expect(transcript.turns).toHaveLength(1);
    expect(transcript.skippedLines).toBe(2);
  });

  it('marks a file with nothing from Claude Code as unrecognized', () => {
    const transcript = read({ 'notes.jsonl': [JSON.stringify({ hello: 'world' })] });

    expect(transcript.files[0]).toMatchObject({ recognized: false, turns: 0 });
    expect(transcript.turns).toEqual([]);
  });
});
