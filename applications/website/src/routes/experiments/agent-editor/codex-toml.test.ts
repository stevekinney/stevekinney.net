import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';

import { emitCodexAgent, multilineString } from './codex-toml';

const base = {
  name: 'code-reviewer',
  description: 'Reviews a diff for correctness bugs.',
  developer_instructions: 'Review the diff.\n\nReport findings.\n',
};

describe('multilineString', () => {
  it.each([
    ['plain text with a trailing newline', 'Line one\nLine two\n'],
    ['text without a trailing newline', 'Line one\nLine two'],
    ['an empty string', ''],
    ['a leading blank line', '\nStarts after a blank line'],
    ['three single quotes', "Don't write ''' in a literal string."],
    ['three double quotes', 'A """docstring""" inside.'],
    ['a trailing single quote', "It ends with a quote'"],
    ['two trailing single quotes', "It ends with two quotes''"],
    ['a trailing double quote', 'It ends with "a quote"'],
    ['backslashes', 'C:\\Users\\steve and a regex \\d+\\s*'],
    ['backslashes with three single quotes', "C:\\path ''' and \\n literally"],
    ['a control character', 'Bell \u0001 here'],
    ['a carriage return', 'Windows\r\nline endings\r\n'],
    ['a lone carriage return', 'Old Mac\rline ending'],
    ['tabs and unicode', '\tIndented — “quoted” ✓\n'],
    ['shell commands and XML tags', '!`git diff --stat`\n<output>$ARGUMENTS</output>\n'],
  ])('round-trips %s', (_label, text) => {
    expect(parse(`value = ${multilineString(text)}`)['value']).toBe(text);
  });

  it('writes a literal string when it can, so the text reads as typed', () => {
    expect(multilineString('Use C:\\path\n')).toBe("'''\nUse C:\\path\n'''");
  });

  it("falls back to a basic string when the text holds '''", () => {
    expect(multilineString("a ''' b")).toMatch(/^"""\n/);
  });
});

describe('emitCodexAgent', () => {
  it('writes the instructions as a readable multiline string', () => {
    const text = emitCodexAgent(base);

    expect(text).toBe(
      [
        'name = "code-reviewer"',
        'description = "Reviews a diff for correctness bugs."',
        "developer_instructions = '''",
        'Review the diff.',
        '',
        'Report findings.',
        "'''",
        '',
      ].join('\n'),
    );
  });

  it('writes known keys in a fixed order whatever order they arrive in', () => {
    const text = emitCodexAgent({
      developer_instructions: 'x\n',
      sandbox_mode: 'read-only',
      model: 'gpt-6.1-sol',
      description: 'd',
      name: 'n',
    });

    expect(text.split('\n').map((line) => line.split(' ')[0])).toEqual([
      'name',
      'description',
      'model',
      'sandbox_mode',
      'developer_instructions',
      'x',
      "'''",
      '',
    ]);
  });

  it('puts every table after the top-level keys, known tables first', () => {
    const agent = {
      ...base,
      approval_policy: 'never',
      shell_environment_policy: { inherit: 'core' },
      tools: { web_search: { context_size: 'low' } },
      mcp_servers: { docs: { command: 'npx', args: ['-y', 'docs-server'] } },
      sandbox_mode: 'read-only',
    };
    const text = emitCodexAgent(agent);

    expect(text.indexOf('approval_policy')).toBeLessThan(text.indexOf('developer_instructions'));
    expect(text.indexOf('[mcp_servers.docs]')).toBeGreaterThan(
      text.indexOf('developer_instructions'),
    );
    expect(text.indexOf('[mcp_servers.docs]')).toBeLessThan(text.indexOf('[tools.web_search]'));
    expect(text.indexOf('[tools.web_search]')).toBeLessThan(
      text.indexOf('[shell_environment_policy]'),
    );
    expect(parse(text)).toEqual(agent);
  });

  it.each([
    ['tricky instructions', { ...base, developer_instructions: 'A \'\'\' and a """ and \\\n' }],
    ['empty instructions', { ...base, developer_instructions: '' }],
    [
      'nickname candidates and effort',
      {
        ...base,
        nickname_candidates: ['Reviewer', 'Second look'],
        model_reasoning_effort: 'high',
        model_verbosity: 'low',
      },
    ],
    [
      'hooks, skills, and an array of tables',
      {
        ...base,
        hooks: {
          PreToolUse: [
            { matcher: 'shell', hooks: [{ type: 'command', command: './check.sh', timeout: 10 }] },
          ],
        },
        skills: { include_instructions: true, config: [{ path: 'skills/a', enabled: false }] },
        profiles: [{ name: 'one' }, { name: 'two' }],
      },
    ],
    ['an empty table', { ...base, tools: {} }],
    ['a quoted key', { ...base, 'odd key.with dots': 1 }],
    ['a multiline description', { ...base, description: 'Two\nlines' }],
  ])('round-trips %s', (_label, agent) => {
    expect(parse(emitCodexAgent(agent))).toEqual(agent);
  });

  it('round-trips a TOML date in a key it keeps as-is', () => {
    const original = parse(
      `name = "n"\ndescription = "d"\ndeveloper_instructions = "x"\nreviewed = 2026-10-06\n`,
    );
    const again = parse(emitCodexAgent(original));

    expect(String(again['reviewed'])).toBe(String(original['reviewed']));
    expect({ ...again, reviewed: null }).toEqual({ ...original, reviewed: null });
  });

  it('leaves out keys with no value', () => {
    expect(emitCodexAgent({ ...base, model: undefined, sandbox_mode: null })).not.toMatch(
      /model|sandbox_mode/,
    );
  });
});
