import { describe, expect, it } from 'vitest';

import { parentSessionOf } from './audit-data';
import { readFixtures, readLinesByFile } from './fixture-reader';
import { createSessionWriter } from './synthetic-sessions';

const FIRST = 'aaaaaaaa-0000-4000-8000-000000000001';
const SECOND = 'aaaaaaaa-0000-4000-8000-000000000002';

const info = {
  sessionId: 'session-1',
  cwd: '/work/app',
  version: '3.1.2',
  model: 'claude-opus-5-5',
};

describe('parentSessionOf', () => {
  it('finds the session folder above a subagents folder', () => {
    expect(parentSessionOf(`projects/app/${FIRST}/subagents/agent-a1.jsonl`)).toBe(FIRST);
    expect(parentSessionOf(`projects/app/${FIRST}.jsonl`)).toBeNull();
    expect(parentSessionOf('subagents/agent-a1.jsonl')).toBeNull();
  });
});

describe('the Claude Code adapter', () => {
  it('counts two records of one response with identical usage as one turn (acceptance check 1)', () => {
    const writer = createSessionWriter(info);
    writer.respond('msg_1', { input: 1_000, cacheRead: 100_000, write5m: 10_000, output: 2_000 }, [
      { id: 'call-1', name: 'Bash', command: 'ls' },
      { id: 'call-2', name: 'Read' },
    ]);
    const lines = writer.lines();

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).message.usage).toEqual(JSON.parse(lines[1]).message.usage);

    const data = readLinesByFile({ 'session.jsonl': lines });

    expect(data.responses).toHaveLength(1);
    expect(data.toolCalls).toHaveLength(2);
  });

  it('reads the fixtures into sessions, subagent turns, failures, and compactions', () => {
    const data = readFixtures();

    expect(data.sessions.map((session) => session.id)).toEqual([FIRST, SECOND]);
    expect(data.sessions[0]).toMatchObject({
      cwd: '/work/app',
      gitBranch: 'main',
      versions: ['3.1.2'],
      models: ['claude-haiku-4-5', 'claude-opus-5-5'],
      subagentFiles: 1,
    });
    expect(data.responses).toHaveLength(4);
    expect(data.responses.filter((response) => response.isSidechain)).toHaveLength(1);
    expect(data.errors).toHaveLength(5);
    expect(data.compactions).toEqual([
      expect.objectContaining({ trigger: 'manual', preTokens: 312_693, postTokens: 12_969 }),
    ]);
    expect(data.skippedLines).toBe(1);
  });

  it('builds the timeout failure the way acceptance check 3 reads it', () => {
    const [timeout] = readFixtures().errors.filter((error) => error.sessionId === FIRST);

    expect(timeout).toMatchObject({
      tool: 'Bash',
      command: 'timeout 5 bun test',
      exitCode: 1,
      message: 'zsh: command not found: timeout',
      signature: 'zsh: command not found: timeout',
      quote: 'zsh: command not found: timeout',
      line: 3,
    });
  });

  it('attributes a result whose call isn’t in any file to the tool “unknown”', () => {
    const orphan = readFixtures().errors.find((error) => error.message === 'Error: socket hang up');

    expect(orphan).toMatchObject({ tool: 'unknown', command: null, exitCode: null });
  });

  it('counts a result whose call isn’t in any file as a call, so failures never outnumber calls', () => {
    const data = readFixtures();

    expect(data.toolCalls.filter((call) => call.name === 'unknown')).toEqual([
      { sessionId: FIRST, timestamp: '2026-09-02T10:01:00.000Z', name: 'unknown' },
    ]);
    expect(data.errors.length).toBeLessThanOrEqual(data.toolCalls.length);
  });

  it('attributes a subagent transcript to the session folder it sits in', () => {
    const agent = createSessionWriter(
      { ...info, sessionId: 'recorded-elsewhere' },
      { isSidechain: true },
    );
    agent
      .respond('msg_a', { input: 1 }, [{ id: 'call-a', name: 'Bash', command: 'ls [x]' }])
      .result('call-a', 'Exit code 1\nzsh: no matches found: [x]', true);

    const data = readLinesByFile({
      'projects/app/parent-session/subagents/agent-1.jsonl': agent.lines(),
    });

    expect(data.errors[0].sessionId).toBe('parent-session');
    expect(data.responses[0].sessionId).toBe('parent-session');
    expect(data.sessions.map((session) => session.id)).toEqual(['parent-session']);
  });

  it('skips missing optional fields quietly', () => {
    const writer = createSessionWriter(info);
    writer.respond('msg_1', { input: 5, write5m: 100, noSplit: true });

    const data = readLinesByFile({ 'session.jsonl': writer.lines() });

    expect(data.sessions[0].gitBranch).toBeNull();
    expect(data.responses[0].usage.cacheWriteSplit).toBeNull();
  });

  it('processes empty and partial files without failing the rest', () => {
    const writer = createSessionWriter(info);
    writer.respond('msg_1', { input: 5 });

    const data = readLinesByFile({
      'empty.jsonl': [],
      'partial.jsonl': ['{"type":"assistant","message":{"id"', 'not json at all', ''],
      'good.jsonl': writer.lines(),
    });

    expect(data.responses).toHaveLength(1);
    expect(data.skippedLines).toBe(2);
    expect(data.files.map((file) => [file.name, file.recognized])).toEqual([
      ['empty.jsonl', false],
      ['partial.jsonl', false],
      ['good.jsonl', true],
    ]);
  });
});
