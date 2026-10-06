import { describe, expect, it } from 'vitest';

import { buildHookShapes } from './build-shapes';
import { checkPayload, formatPath } from './check';

const shapes = buildHookShapes();

const sampleOf = (tool: 'claude' | 'codex', name: string, kind: 'input' | 'output'): string => {
  const event = shapes[tool].events.find((candidate) => candidate.name === name);
  if (!event) throw new Error(`No ${tool} event ${name}`);

  return kind === 'input' ? event.sampleInput : event.sampleOutput;
};

const edit = (text: string, change: (payload: Record<string, unknown>) => void): string => {
  const payload = JSON.parse(text) as Record<string, unknown>;
  change(payload);

  return JSON.stringify(payload);
};

describe('formatPath', () => {
  it('joins keys with dots and indexes with brackets', () => {
    expect(formatPath(['tool_calls', 0, 'tool_name'])).toBe('tool_calls[0].tool_name');
    expect(formatPath([])).toBe('');
  });
});

describe('checkPayload', () => {
  it.each([
    ['claude', 'PreToolUse', 'input'],
    ['claude', 'PermissionRequest', 'output'],
    ['claude', 'SessionEnd', 'output'],
    ['codex', 'PreToolUse', 'input'],
    ['codex', 'Interrupt', 'output'],
  ] as const)('accepts the %s %s %s sample', (tool, event, kind) => {
    expect(checkPayload(tool, event, kind, sampleOf(tool, event, kind))).toEqual({ ok: true });
  });

  it('reports a missing required field at its path', () => {
    const text = edit(sampleOf('claude', 'PreToolUse', 'input'), (payload) => {
      delete payload['tool_name'];
    });
    const result = checkPayload('claude', 'PreToolUse', 'input', text);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.path)).toEqual(['tool_name']);
  });

  it('checks against the selected event, not the one the payload names', () => {
    const text = edit(sampleOf('claude', 'PreToolUse', 'input'), (payload) => {
      payload['hook_event_name'] = 'PostToolUse';
    });
    const result = checkPayload('claude', 'PreToolUse', 'input', text);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((issue) => issue.path)).toContain('hook_event_name');
  });

  it('keeps unknown keys in Claude Code payloads', () => {
    const text = edit(sampleOf('claude', 'Stop', 'input'), (payload) => {
      payload['something_new'] = true;
    });

    expect(checkPayload('claude', 'Stop', 'input', text)).toEqual({ ok: true });
  });

  it('keeps unknown keys and the async form in Claude Code output', () => {
    const extra = JSON.stringify({ systemMessage: 'Hi', something_new: true });

    expect(checkPayload('claude', 'PreToolUse', 'output', extra)).toEqual({ ok: true });
    expect(checkPayload('claude', 'Stop', 'output', '{ "async": true }')).toEqual({ ok: true });
  });

  it('rejects a Claude Code hookSpecificOutput for another event', () => {
    const text = JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse' } });
    const result = checkPayload('claude', 'PreToolUse', 'output', text);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toContain(
        'hookSpecificOutput.hookEventName',
      );
    }
  });

  it('rejects hookSpecificOutput on a Claude Code event that has none', () => {
    const text = JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionEnd' } });
    const result = checkPayload('claude', 'SessionEnd', 'output', text);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual([
        {
          path: 'hookSpecificOutput',
          message: 'SessionEnd has no hookSpecificOutput, so leave it out.',
        },
      ]);
    }
  });

  it('rejects an unknown key in a Codex output', () => {
    const text = JSON.stringify({ systemMessage: 'Hi', extra: 1 });
    const result = checkPayload('codex', 'Stop', 'output', text);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.length).toBeGreaterThan(0);
  });

  it('reports a nested path', () => {
    const text = JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'maybe' } },
    });
    const result = checkPayload('claude', 'PermissionRequest', 'output', text);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path.startsWith('hookSpecificOutput.decision')),
      ).toBe(true);
    }
  });

  it('reports JSON that doesn’t parse', () => {
    const result = checkPayload('codex', 'Stop', 'input', '{ "session_id": ');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.syntaxError).toBeTruthy();
      expect(result.issues).toEqual([]);
    }
  });

  it('refuses an event the tool doesn’t have', () => {
    expect(() => checkPayload('codex', 'Setup', 'input', '{}')).toThrow(/Unknown event/);
  });
});
