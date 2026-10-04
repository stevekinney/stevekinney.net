import { describe, expect, it } from 'vitest';

import { toSourceFiles } from '$lib/experiments/dropped-files';

import { isSessionFile, readSessionFiles } from './session-files';

const assistantLine = (id: string, input: number): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'session-1',
    message: { id, model: 'claude-opus-5-5', usage: { input_tokens: input, output_tokens: 1 } },
  });

describe('readSessionFiles', () => {
  it('reads every file through one collector and reports which file it is on', async () => {
    const started: number[] = [];
    const files = toSourceFiles([
      new File([`${assistantLine('b', 20)}\n`], 'session/subagents/agent-1.jsonl'),
      new File([`${assistantLine('a', 10)}\n${assistantLine('b', 20)}\n`], 'session.jsonl'),
    ]);

    const session = await readSessionFiles(files, (index) => started.push(index));

    expect(started).toEqual([0, 1]);
    expect(session.files.map((file) => file.name)).toEqual([
      'session.jsonl',
      'session/subagents/agent-1.jsonl',
    ]);
    expect(session.requests).toBe(2);
    expect(session.total.uncachedInput).toBe(30);
  });
});

describe('isSessionFile', () => {
  it('keeps transcripts and skips the other files a session folder holds', () => {
    expect(isSessionFile('session/subagents/agent-1.jsonl')).toBe(true);
    expect(isSessionFile('session/tool-results/output.txt')).toBe(false);
  });
});
