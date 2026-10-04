import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createTranscriptReader } from '$lib/experiments/claude-code-transcript';

import { isSessionFile, summarizeSession } from './session-import';

const fixtureLines = (name: string): string[] =>
  readFileSync(
    fileURLToPath(new URL(`../../../../tests/fixtures/cache-break-even/${name}`, import.meta.url)),
    'utf8',
  ).split('\n');

const summarize = (files: Record<string, string[]>) => {
  const reader = createTranscriptReader();

  for (const [name, lines] of Object.entries(files)) {
    const file = reader.readFile(name);
    lines.forEach(file.addLine);
    file.finish();
  }

  return summarizeSession(reader.summarize());
};

describe('summarizeSession', () => {
  const session = summarize({ 'session.jsonl': fixtureLines('session-opus-5.jsonl') });

  it('takes N from the latest main-thread turn', () => {
    expect(session?.contextTokens).toBe(312_000);
    expect(session?.modelId).toBe('claude-opus-5');
  });

  it('counts each message ID once and leaves subagent responses out', () => {
    expect(session?.turns).toBe(5);
    expect(session?.sidechainTurns).toBe(1);
  });

  it('measures output from the last line of each streamed response', () => {
    expect(session?.meanOutput).toBe(1_400);
    expect(session?.medianOutput).toBe(1_200);
  });

  it('reports the last compaction as Claude Code recorded it', () => {
    expect(session?.lastCompaction).toMatchObject({
      trigger: 'auto',
      preTokens: 168_000,
      postTokens: 22_000,
    });
  });

  it('counts lines that were not complete JSON instead of failing', () => {
    expect(session?.skippedLines).toBe(2);
  });

  it('returns nothing for a file with no responses', () => {
    expect(summarize({ 'empty.jsonl': ['{"type":"user","sessionId":"s"}', 'garbage'] })).toBeNull();
  });
});

describe('isSessionFile', () => {
  it('keeps session files and skips subagent folders and other files', () => {
    expect(isSessionFile('project/session.jsonl')).toBe(true);
    expect(isSessionFile('project/session/subagents/agent-1.jsonl')).toBe(false);
    expect(isSessionFile('project/notes.md')).toBe(false);
  });
});
