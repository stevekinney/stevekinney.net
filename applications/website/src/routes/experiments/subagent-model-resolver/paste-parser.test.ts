import { describe, expect, it } from 'vitest';

import { parseAgentLine, parsePastedOutput } from './paste-parser';
import { v } from './versions';

describe('acceptance 8: paste parsing', () => {
  it('reads a Windows agent line as reviewer with model haiku', () => {
    expect(parseAgentLine('C:\\Users\\x\\.claude\\agents\\reviewer.md:3:model: haiku')).toEqual({
      name: 'reviewer',
      path: 'C:\\Users\\x\\.claude\\agents\\reviewer.md',
      model: 'haiku',
    });
  });

  it('reads CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1 as FORCE and not as the env model', () => {
    const parsed = parsePastedOutput('CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1');

    expect(parsed.force).toEqual({ raw: '1', origin: 'shell' });
    expect(parsed.environmentModel).toBeNull();
  });
});

describe('parsePastedOutput', () => {
  const output = [
    '2.1.278 (Claude Code)',
    'CLAUDE_CODE_SUBAGENT_MODEL=haiku',
    '  "CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "1",',
    '/Users/me/.claude/agents/reviewer.md:3:model: opus',
    '.claude/agents/planner.md:model: sonnet',
  ].join('\n');

  it('reads every kind of line, in any order', () => {
    const parsed = parsePastedOutput(output);

    expect(parsed.version).toEqual(v(278));
    expect(parsed.environmentModel).toEqual({ raw: 'haiku', origin: 'shell' });
    expect(parsed.force).toEqual({ raw: '1', origin: 'settings' });
    expect(parsed.agents.map((agent) => [agent.name, agent.model])).toEqual([
      ['reviewer', 'opus'],
      ['planner', 'sonnet'],
    ]);
    expect(parsed.ignored).toBe(0);

    expect(parsePastedOutput(output.split('\n').reverse().join('\n')).agents).toHaveLength(2);
  });

  it('reads a settings-file env line with a quoted value', () => {
    expect(parsePastedOutput('"CLAUDE_CODE_SUBAGENT_MODEL": "opus"').environmentModel).toEqual({
      raw: 'opus',
      origin: 'settings',
    });
  });

  it('keeps only the first version and requires a line that mentions claude or starts with one', () => {
    expect(parsePastedOutput('node 22.4.1\n2.1.200\n2.1.100 (Claude Code)').version).toEqual(
      v(200),
    );
  });

  it('deduplicates repeated lines, and keeps different paths and models apart', () => {
    const parsed = parsePastedOutput(
      [
        'a/x.md:1:model: haiku',
        'a/x.md:1:model: haiku',
        'b/x.md:1:model: haiku',
        'c/x.md:1:model: opus',
      ].join('\n'),
    );

    expect(parsed.agents.map((agent) => agent.model)).toEqual(['haiku', 'haiku', 'opus']);
  });

  it('reads a model declaration that ends with a YAML comment', () => {
    const parsed = parsePastedOutput('a/x.md:1:model: sonnet # keep reviews cheap');

    expect(parsed.agents.map((agent) => agent.model)).toEqual(['sonnet']);
  });

  it('ignores a model value with characters it does not expect, and a line with no file', () => {
    expect(parsePastedOutput('a/x.md:1:model: has spaces here').agents).toEqual([]);
    expect(parsePastedOutput('model: opus').agents).toEqual([]);
  });

  it('tolerates partial output and reports lines it could not read', () => {
    const parsed = parsePastedOutput('hello\n\nCLAUDE_CODE_SUBAGENT_MODEL=sonnet\r\n');

    expect(parsed.environmentModel?.raw).toBe('sonnet');
    expect(parsed.understood).toBe(1);
    expect(parsed.ignored).toBe(1);
  });

  it('reads nothing from empty text', () => {
    expect(parsePastedOutput('')).toMatchObject({ understood: 0, ignored: 0, agents: [] });
  });
});
