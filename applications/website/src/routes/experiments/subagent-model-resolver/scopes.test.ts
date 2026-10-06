import { describe, expect, it } from 'vitest';

import { resolvePrecedence } from './agent-precedence';
import type { PrecedenceCandidate } from './agent-precedence';
import {
  agentsRootOf,
  containsWorkingDirectory,
  guessAgentScope,
  guessSettingsScope,
  projectDirectoryOf,
} from './scopes';

describe('guessAgentScope', () => {
  it('reads a home folder as the user scope', () => {
    expect(guessAgentScope('/Users/me/.claude/agents/a.md')).toBe('user');
    expect(guessAgentScope('C:\\Users\\x\\.claude\\agents\\reviewer.md')).toBe('user');
    expect(guessAgentScope('home/.claude/agents/a.md')).toBe('user');
    expect(guessAgentScope('~/.claude/agents/a.md')).toBe('user');
  });

  it('reads a repository folder as the project scope', () => {
    expect(guessAgentScope('my-repository/.claude/agents/a.md')).toBe('project');
    expect(guessAgentScope('.claude/agents/a.md')).toBe('project');
    expect(guessAgentScope('agents/a.md')).toBe('project');
    expect(guessAgentScope('a.md')).toBe('project');
  });

  it('reads managed and plugin locations', () => {
    expect(guessAgentScope('managed/.claude/agents/a.md')).toBe('managed');
    expect(guessAgentScope('/Library/Application Support/ClaudeCode/.claude/agents/a.md')).toBe(
      'managed',
    );
    expect(guessAgentScope('plugins/cache/tools/1.0/agents/a.md')).toBe('plugin');
    expect(guessAgentScope('my-plugin/agents/a.md')).toBe('plugin');
  });
});

describe('guessSettingsScope', () => {
  it('tells the settings files apart', () => {
    expect(guessSettingsScope('settings.local.json')).toBe('project-local');
    expect(guessSettingsScope('/Users/me/.claude/settings.json')).toBe('user');
    expect(guessSettingsScope('repo/.claude/settings.json')).toBe('project');
    expect(guessSettingsScope('managed-settings.json')).toBe('managed');
  });
});

describe('paths', () => {
  it('finds the agents folder and the project directory above it', () => {
    expect(agentsRootOf('repo/.claude/agents/team/a.md')).toEqual(['repo', '.claude', 'agents']);
    expect(projectDirectoryOf('repo/packages/web/.claude/agents/a.md')).toEqual([
      'repo',
      'packages',
      'web',
    ]);
    expect(projectDirectoryOf('.claude/agents/a.md')).toEqual([]);
  });

  it('matches a directory anywhere inside an absolute working directory', () => {
    const working = ['Users', 'me', 'repo', 'packages', 'web', 'src'];

    expect(containsWorkingDirectory(['repo'], working)).toBe(true);
    expect(containsWorkingDirectory(['repo', 'packages', 'web'], working)).toBe(true);
    expect(containsWorkingDirectory(['repo', 'packages', 'api'], working)).toBe(false);
    expect(containsWorkingDirectory([], working)).toBe(true);
  });
});

describe('resolvePrecedence', () => {
  const candidate = (
    id: string,
    scope: PrecedenceCandidate['scope'],
    overrides: Partial<PrecedenceCandidate> = {},
  ): PrecedenceCandidate => ({
    id,
    name: 'reviewer',
    scope,
    tree: id,
    projectDirectory: [],
    ...overrides,
  });

  it('lets project shadow user, and managed shadow both', () => {
    const statuses = resolvePrecedence(
      [candidate('user', 'user'), candidate('project', 'project'), candidate('managed', 'managed')],
      '',
    );

    expect(statuses.get('managed')).toEqual({ kind: 'effective' });
    expect(statuses.get('project')).toMatchObject({ kind: 'shadowed', by: 'managed' });
    expect(statuses.get('user')).toMatchObject({ kind: 'shadowed', by: 'managed' });
  });

  it('orders managed, the flag, project, user, then plugin', () => {
    const statuses = resolvePrecedence(
      [candidate('plugin', 'plugin'), candidate('user', 'user'), candidate('cli', 'cli')],
      '',
    );

    expect(statuses.get('cli')).toEqual({ kind: 'effective' });
    expect(statuses.get('user')).toMatchObject({ kind: 'shadowed', by: 'cli' });
    expect(statuses.get('plugin')).toMatchObject({ kind: 'shadowed', by: 'cli' });
  });

  it('leaves different names alone', () => {
    const statuses = resolvePrecedence(
      [candidate('a', 'user'), candidate('b', 'project', { name: 'other' })],
      '',
    );

    expect(statuses.get('a')).toEqual({ kind: 'effective' });
    expect(statuses.get('b')).toEqual({ kind: 'effective' });
  });

  it('flags two files in the same agents tree as an ambiguous duplicate', () => {
    const statuses = resolvePrecedence(
      [
        candidate('one', 'project', { tree: 'same' }),
        candidate('two', 'project', { tree: 'same' }),
        candidate('user', 'user'),
      ],
      '',
    );

    expect(statuses.get('one')?.kind).toBe('ambiguous');
    expect(statuses.get('two')?.kind).toBe('ambiguous');
    expect(statuses.get('user')).toMatchObject({ kind: 'shadowed', by: 'one' });
  });

  it('picks the project directory closest to the working directory', () => {
    const nested = [
      candidate('root', 'project', { projectDirectory: ['repo'] }),
      candidate('web', 'project', { projectDirectory: ['repo', 'packages', 'web'] }),
      candidate('api', 'project', { projectDirectory: ['repo', 'packages', 'api'] }),
    ];
    const statuses = resolvePrecedence(nested, 'repo/packages/web/src');

    expect(statuses.get('web')).toEqual({ kind: 'effective' });
    expect(statuses.get('root')).toMatchObject({ kind: 'shadowed', by: 'web' });
    expect(statuses.get('api')).toMatchObject({ kind: 'shadowed', by: 'web' });
  });

  it('asks for a working directory when nested project directories collide', () => {
    const statuses = resolvePrecedence(
      [
        candidate('root', 'project', { projectDirectory: ['repo'] }),
        candidate('web', 'project', { projectDirectory: ['repo', 'web'] }),
      ],
      '',
    );

    expect(statuses.get('root')).toMatchObject({ kind: 'ambiguous' });
    expect((statuses.get('web') as { reason: string }).reason).toContain('working directory');
  });

  it('flags a name in two user locations as ambiguous', () => {
    const statuses = resolvePrecedence([candidate('a', 'user'), candidate('b', 'user')], '');

    expect(statuses.get('a')?.kind).toBe('ambiguous');
  });
});
