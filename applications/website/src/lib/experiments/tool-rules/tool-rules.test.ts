import { describe, expect, it } from 'vitest';

import { claudeTools } from './claude-tools';
import {
  accessIssues,
  agentRestriction,
  canUseTool,
  extraRules,
  formatMcpRule,
  formatToolRule,
  isLastTool,
  parseToolRule,
  readToolAccess,
  resolvesToTool,
  ruleIssues,
  setAccessMode,
  setAgentRestriction,
  setToolUse,
  splitToolList,
  withExtraRules,
} from './tool-rules';

const messages = (issues: { message: string }[]): string => issues.map((i) => i.message).join(' ');

describe('splitToolList', () => {
  it('splits a string at commas, but not inside parentheses', () => {
    expect(splitToolList('Read, Bash(git diff *, git log *), Agent(a, b)')).toEqual([
      'Read',
      'Bash(git diff *, git log *)',
      'Agent(a, b)',
    ]);
  });

  it('reads a YAML list and ignores blanks and non-strings', () => {
    expect(splitToolList([' Read ', '', 3, 'Edit'])).toEqual(['Read', 'Edit']);
    expect(splitToolList(undefined)).toEqual([]);
  });
});

describe('parseToolRule and formatting', () => {
  it('reads built-in tools with and without a specifier', () => {
    expect(parseToolRule('Read')).toEqual({ kind: 'tool', tool: 'Read', specifier: null });
    expect(parseToolRule('Bash(git log *)')).toEqual({
      kind: 'tool',
      tool: 'Bash',
      specifier: 'git log *',
    });
  });

  it('reads MCP rules for a whole server or one tool', () => {
    expect(parseToolRule('mcp__github')).toEqual({ kind: 'mcp', server: 'github', tool: null });
    expect(parseToolRule('mcp__github__*')).toEqual({ kind: 'mcp', server: 'github', tool: null });
    expect(parseToolRule('mcp__github__create_issue')).toEqual({
      kind: 'mcp',
      server: 'github',
      tool: 'create_issue',
    });
  });

  it('formats rules back', () => {
    expect(formatToolRule('Bash', ' git log * ')).toBe('Bash(git log *)');
    expect(formatToolRule('Read', '')).toBe('Read');
    expect(formatMcpRule('github')).toBe('mcp__github');
    expect(formatMcpRule('github', 'create_issue')).toBe('mcp__github__create_issue');
  });
});

describe('ruleIssues', () => {
  it('accepts scoped pre-approval rules', () => {
    for (const rule of ['Bash(git log *)', 'Read(./src/**)', 'WebFetch(domain:x.dev)', 'mcp__a']) {
      expect(ruleIssues(rule, 'pre-approve')).toEqual([]);
    }
  });

  it('warns that bare Bash pre-approves every command', () => {
    expect(messages(ruleIssues('Bash', 'pre-approve'))).toContain('every command');
  });

  it('warns that a specifier in a removal list removes the whole tool', () => {
    expect(messages(ruleIssues('Bash(git push *)', 'remove'))).toContain('removes all of');
  });

  it('accepts mcp__* in a removal list but not elsewhere', () => {
    expect(ruleIssues('mcp__*', 'remove')).toEqual([]);
    expect(ruleIssues('mcp__*', 'pre-approve')[0]?.severity).toBe('error');
  });

  it('flags unknown names, WebFetch rules without domain:, and parameter rules in pre-approval', () => {
    expect(messages(ruleIssues('read', 'allowlist'))).toContain('case-sensitive');
    expect(ruleIssues('WebFetch(example.com)', 'pre-approve')[0]?.severity).toBe('error');
    expect(messages(ruleIssues('Agent(model:opus)', 'pre-approve'))).toContain('deny and ask');
    expect(messages(ruleIssues('WebSearch(foo)', 'pre-approve'))).toContain('no specifier');
  });

  it('allows Agent(...) in a subagent allowlist but warns about other specifiers there', () => {
    expect(ruleIssues('Agent(researcher, analyst)', 'allowlist')).toEqual([]);
    expect(messages(ruleIssues('Bash(git *)', 'allowlist'))).toContain('takes tool names');
  });
});

describe('tool access', () => {
  it('inherits everything without a tools list', () => {
    const access = readToolAccess(undefined, 'Bash');

    expect(access.mode).toBe('inherit');
    expect(canUseTool(access, 'Read')).toBe(true);
    expect(canUseTool(access, 'Bash')).toBe(false);
  });

  it('never leaves a tool in both lists', () => {
    let access = readToolAccess('Read, Grep', 'Edit');
    access = setToolUse(access, 'Edit', true);

    expect(access.allowed).toContain('Edit');
    expect(access.blocked).not.toContain('Edit');

    access = setToolUse(access, 'Read', false);
    expect(access.allowed).not.toContain('Read');
    expect(access.blocked).not.toContain('Read');
  });

  it('blocks in inherit mode', () => {
    expect(setToolUse(readToolAccess(undefined, undefined), 'Bash', false).blocked).toEqual([
      'Bash',
    ]);
  });

  it('keeps what the agent could use when switching to a list', () => {
    const listed = setAccessMode(readToolAccess(undefined, 'Bash, mcp__github'), 'only');

    expect(listed.allowed).toContain('Read');
    expect(listed.allowed).not.toContain('Bash');
    expect(listed.allowed).not.toContain('TodoWrite');
    expect(listed.blocked).toEqual(['mcp__github']);
  });

  it('reads and edits an Agent(...) restriction', () => {
    const access = readToolAccess('Read, Agent(researcher, analyst)', undefined);

    expect(agentRestriction(access)).toEqual(['researcher', 'analyst']);
    expect(setAgentRestriction(access, []).allowed).toContain('Agent');
    expect(setAgentRestriction(access, ['scout']).allowed).toContain('Agent(scout)');
    expect(agentRestriction(readToolAccess('Agent', undefined))).toBeNull();
  });

  it('keeps an Agent(...) restriction when the tool is toggled back on', () => {
    const access = readToolAccess('Agent(scout)', undefined);

    expect(setToolUse(access, 'Agent', true).allowed).toEqual(['Agent(scout)']);
  });

  it('separates MCP and unknown entries from built-in ones', () => {
    const rules = ['Read', 'mcp__github__create_issue', 'Mystery'];

    expect(extraRules(rules)).toEqual(['mcp__github__create_issue', 'Mystery']);
    expect(withExtraRules(rules, ['mcp__docs'])).toEqual(['Read', 'mcp__docs']);
  });

  it('explains overlap and the Glob and Grep rule', () => {
    const access = { mode: 'only' as const, allowed: ['Grep', 'Bash'], blocked: ['Bash'] };

    expect(messages(accessIssues(access))).toContain('in both');
    expect(messages(accessIssues(access))).toContain('leaves out `Bash`');
  });
});

describe('catalog', () => {
  it('has unique names', () => {
    const names = claudeTools.map((tool) => tool.name);

    expect(new Set(names).size).toBe(names.length);
  });
});

describe('separators and resolution', () => {
  it('splits at spaces only when asked, never inside parentheses', () => {
    expect(splitToolList('Bash(git add *) Bash(git commit *), Read', 'commas-or-spaces')).toEqual([
      'Bash(git add *)',
      'Bash(git commit *)',
      'Read',
    ]);
    expect(splitToolList('Read Grep')).toEqual(['Read Grep']);
  });

  it('explains a space-separated agent list instead of calling it unknown', () => {
    expect(messages(ruleIssues('Read Grep', 'allowlist'))).toContain('Separate tools with commas');
  });

  it('is an error when nothing in a listing resolves to a tool', () => {
    const issues = accessIssues(readToolAccess('Read Grep', undefined));

    expect(issues.find((issue) => issue.severity === 'error')?.message).toContain('won’t launch');
    expect(accessIssues(readToolAccess('mcp__github', undefined))).toEqual([]);
    expect(
      accessIssues({ mode: 'only', allowed: ['Read'], blocked: ['Read'] }).some(
        (issue) => issue.severity === 'error',
      ),
    ).toBe(true);
  });

  it('keeps the last usable tool on', () => {
    const access = readToolAccess('Read, Mystery', undefined);

    expect(isLastTool(access, 'Read')).toBe(true);
    expect(isLastTool(readToolAccess('Read, Grep', undefined), 'Read')).toBe(false);
    expect(isLastTool(readToolAccess(undefined, undefined), 'Read')).toBe(false);
  });

  it('knows which entries are tools', () => {
    expect(resolvesToTool('Read')).toBe(true);
    expect(resolvesToTool('mcp__github__x')).toBe(true);
    expect(resolvesToTool('mcp__*')).toBe(false);
    expect(resolvesToTool('Mystery')).toBe(false);
  });
});
