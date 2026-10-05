import { describe, expect, it } from 'vitest';

import { createTranscriptReader } from '$lib/experiments/claude-code-transcript';
import type { ClaudeCodeTranscript } from '$lib/experiments/claude-code-transcript';

import { calibrateSpawnOverhead, median, readPastedTranscript } from './calibrate';

type Usage = { input?: number; cacheRead?: number; cacheWrite?: number; output?: number };

/** A synthetic assistant line, shaped like Claude Code's but invented for this test. */
const response = (
  id: string,
  second: number,
  { input = 0, cacheRead = 0, cacheWrite = 0, output = 0 }: Usage,
  extra: Record<string, unknown> = {},
): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'session-1',
    timestamp: `2026-10-04T10:00:${String(second).padStart(2, '0')}.000Z`,
    ...extra,
    message: {
      id,
      model: 'claude-sonnet-5-5',
      role: 'assistant',
      usage: {
        input_tokens: input,
        cache_read_input_tokens: cacheRead,
        cache_creation_input_tokens: cacheWrite,
        output_tokens: output,
      },
    },
  });

const subagent = (agentId: string) => ({ isSidechain: true, agentId });

const read = (files: Record<string, string[]>): ClaudeCodeTranscript => {
  const reader = createTranscriptReader();

  for (const [name, lines] of Object.entries(files)) {
    const file = reader.readFile(name);
    lines.forEach(file.addLine);
    file.finish();
  }

  return reader.summarize();
};

describe('median', () => {
  it('takes the middle value, or the mean of the middle two', () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
    expect(median([])).toBeNull();
  });
});

describe('calibrateSpawnOverhead', () => {
  it('measures each subagent’s first response and reports the median and range', () => {
    const transcript = read({
      'session.jsonl': [response('main', 0, { cacheRead: 90_000 })],
      'session/subagents/agent-a.jsonl': [
        // Streamed twice: the same context, and the last line wins.
        response(
          'a1',
          1,
          { input: 2, cacheRead: 4_000, cacheWrite: 8_000, output: 4 },
          subagent('a'),
        ),
        response(
          'a1',
          2,
          { input: 2, cacheRead: 4_000, cacheWrite: 8_000, output: 80 },
          subagent('a'),
        ),
        response('a2', 3, { cacheRead: 30_000 }, subagent('a')),
      ],
      'session/subagents/agent-b.jsonl': [
        response('b1', 4, { cacheWrite: 20_000 }, subagent('b')),
        'not json',
      ],
      'session/subagents/agent-c.jsonl': [response('c1', 5, { input: 41_000 }, subagent('c'))],
    });

    expect(calibrateSpawnOverhead(transcript)).toEqual({
      calibration: {
        subagents: 3,
        median: 20_000,
        minimum: 12_002,
        maximum: 41_000,
        files: 4,
        skippedLines: 1,
      },
      message: null,
    });
  });

  it('says where subagent transcripts live when a file has none', () => {
    const result = calibrateSpawnOverhead(
      read({ 'session.jsonl': [response('main', 0, { cacheRead: 9_000 }), '{"cut off'] }),
    );

    expect(result.calibration).toBeNull();
    expect(result.message).toBe(
      'That has no subagent responses. Subagent transcripts sit in a subagents folder beside the session file, so choose that folder, or the session’s whole folder. Skipped 1 malformed line.',
    );
  });

  it('says when nothing looks like a transcript', () => {
    const result = calibrateSpawnOverhead(read({ 'notes.jsonl': ['{"hello":"world"}'] }));

    expect(result.message).toMatch(/^None of that looked like a Claude Code transcript/);
  });
});

describe('readPastedTranscript', () => {
  it('reads pasted lines with the shared reader and counts the malformed ones', () => {
    const transcript = readPastedTranscript(
      [
        response('p1', 1, { cacheWrite: 15_000 }, subagent('p')),
        '',
        '{"truncated": ',
        response('q1', 2, { cacheWrite: 25_000 }, subagent('q')),
      ].join('\n'),
    );
    const result = calibrateSpawnOverhead(transcript);

    expect(result.calibration).toMatchObject({ subagents: 2, median: 20_000, skippedLines: 1 });
  });
});
