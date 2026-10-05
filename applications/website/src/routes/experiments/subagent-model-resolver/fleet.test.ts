import { describe, expect, it } from 'vitest';

import { analyzeFleet, configurationForRow, isSettingsPath, rowMatchesFilter } from './fleet';
import type { FleetInput, UploadedAgentFile } from './fleet';
import { defaultSettingsPrecedence } from './effective-settings';
import { baseConfiguration } from './presets';
import { defaultRange, v } from './versions';

const agentFile = (
  id: string,
  path: string,
  frontmatter: string[],
  batch = 0,
): UploadedAgentFile => ({
  id,
  batch,
  path,
  text: ['---', ...frontmatter, '---', '', 'Prompt.', ''].join('\n'),
});

const input = (overrides: Partial<FleetInput> = {}): FleetInput => ({
  agentFiles: [],
  agentScopes: {},
  settingsFiles: [],
  settingsPrecedence: defaultSettingsPrecedence,
  cliAgentsText: '',
  workingDirectory: '',
  shellEnvironmentText: '',
  pastedText: '',
  versionText: '',
  controls: baseConfiguration,
  range: defaultRange,
  comparison: { mode: 'boundary' },
  ...overrides,
});

const row = (analysis: ReturnType<typeof analyzeFleet>, name: string) =>
  analysis.rows.filter((entry) => entry.name === name);

describe('which settings files count', () => {
  it('takes a lone file, a .claude file, and a managed settings file', () => {
    for (const path of [
      'settings.json',
      'repo/.claude/settings.local.json',
      'home/.claude/settings.json',
      '/Library/Application Support/ClaudeCode/managed-settings.json',
      'etc/claude-code/managed-settings.json',
    ]) {
      expect(isSettingsPath(path)).toBe(true);
    }
  });

  it('skips settings files that belong to something else', () => {
    for (const path of ['repo/.vscode/settings.json', 'repo/app/settings.local.json']) {
      expect(isSettingsPath(path)).toBe(false);
    }
  });
});

describe('acceptance 9: uploads', () => {
  const files = [
    agentFile(
      'user-reviewer',
      'home/.claude/agents/reviewer.md',
      ['name: reviewer', 'model: haiku'],
      0,
    ),
    agentFile(
      'project-reviewer',
      'repo/.claude/agents/reviewer.md',
      ['name: reviewer', 'model: opus'],
      1,
    ),
    agentFile(
      'managed-reviewer',
      'managed/.claude/agents/reviewer.md',
      ['name: reviewer', 'model: sonnet'],
      2,
    ),
  ];

  it('resolves only the project definition and marks the user one shadowed by it', () => {
    const analysis = analyzeFleet(input({ agentFiles: files.slice(0, 2) }));
    const reviewers = row(analysis, 'reviewer');

    expect(reviewers).toHaveLength(2);
    const project = reviewers.find((entry) => entry.definition?.id === 'project-reviewer');
    const user = reviewers.find((entry) => entry.definition?.id === 'user-reviewer');

    expect(project?.status).toEqual({ kind: 'effective' });
    expect(project?.after).not.toBeNull();
    expect(user?.status).toMatchObject({ kind: 'shadowed' });
    expect(user?.shadowedBy?.id).toBe('project-reviewer');
    expect(user?.before).toBeNull();
    expect(user?.after).toBeNull();
  });

  it('lets a managed agent with the same name shadow both', () => {
    const analysis = analyzeFleet(input({ agentFiles: files }));
    const byId = Object.fromEntries(
      row(analysis, 'reviewer').map((entry) => [entry.definition?.id, entry]),
    );

    expect(byId['managed-reviewer'].status).toEqual({ kind: 'effective' });
    expect(byId['project-reviewer'].shadowedBy?.id).toBe('managed-reviewer');
    expect(byId['user-reviewer'].shadowedBy?.id).toBe('managed-reviewer');
    expect(analysis.shadowedCount).toBe(2);
  });

  it('replaces the synthetic Explore row with a project agent named Explore, as custom', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [
          agentFile('explore', 'repo/.claude/agents/explore.md', ['name: Explore', 'model: haiku']),
        ],
        controls: { ...baseConfiguration, mainModel: 'opus', version: v(278) },
      }),
    );
    const explore = row(analysis, 'Explore');

    expect(explore).toHaveLength(1);
    expect(explore[0].kind).toBe('custom');
    expect(explore[0].overridesBuiltIn).toBe(true);
    expect(explore[0].after).toBe('haiku');
    expect(analysis.rows.map((entry) => entry.name)).toContain('Plan');
    expect(analysis.rows.map((entry) => entry.name)).toContain('general-purpose');
  });

  it('counts same-name definitions that tie once, while keeping both rows', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [
          agentFile('first', 'home/.claude/agents/first.md', ['name: twin', 'model: haiku']),
          agentFile('second', 'home/.claude/agents/second.md', ['name: twin', 'model: opus']),
        ],
      }),
    );
    const baseline = analyzeFleet(input());

    expect(row(analysis, 'twin')).toHaveLength(2);
    expect(row(analysis, 'twin').every((entry) => entry.status.kind === 'ambiguous')).toBe(true);
    expect(analysis.ambiguousCount).toBe(2);
    // The built-ins plus one `twin`, not two.
    expect(analysis.agentCount).toBe(baseline.agentCount + 1);
    expect(analysis.summary.moved + analysis.summary.unchanged).toBe(analysis.agentCount);
  });

  it('treats malformed --agents text as input, so its warning can be shown', () => {
    const analysis = analyzeFleet(input({ cliAgentsText: '[1]' }));

    expect(analysis.hasInput).toBe(true);
    expect(analysis.warnings.length).toBeGreaterThan(0);
    expect(analyzeFleet(input({ cliAgentsText: '   ' })).hasInput).toBe(false);
  });

  it('lists an agent with no model line, declaring "not set"', () => {
    const analysis = analyzeFleet(
      input({ agentFiles: [agentFile('quiet', 'repo/.claude/agents/quiet.md', ['name: quiet'])] }),
    );
    const quiet = row(analysis, 'quiet')[0];

    expect(quiet.declares).toBe('not set');
    expect(analysis.noModelLineCount).toBe(1);
    expect(rowMatchesFilter(quiet, 'no-model')).toBe(true);
    expect(rowMatchesFilter(row(analysis, 'Plan')[0], 'no-model')).toBe(false);
  });

  it('honours a scope the person corrected', () => {
    const corrected = analyzeFleet(
      input({
        agentFiles: files.slice(0, 2),
        agentScopes: { '0:home/.claude/agents': 'managed' },
      }),
    );

    expect(
      row(corrected, 'reviewer').find((entry) => entry.definition?.id === 'user-reviewer')?.status,
    ).toEqual({ kind: 'effective' });
  });
});

describe('fleet columns and verdicts', () => {
  const classic = {
    ...baseConfiguration,
    environmentModel: 'haiku' as const,
    mainModel: 'sonnet' as const,
  };
  const opusAgent = agentFile('opus', 'repo/.claude/agents/opus.md', [
    'name: opus-agent',
    'model: opus',
  ]);

  it('compares before 2.1.251 with the user’s version when they are past it', () => {
    const analysis = analyzeFleet(
      input({ agentFiles: [opusAgent], controls: { ...classic, version: v(278) } }),
    );
    const agent = row(analysis, 'opus-agent')[0];

    expect(analysis.columns.beforeLabel).toBe('Before 2.1.251');
    expect(analysis.columns.afterLabel).toBe('On 2.1.278');
    expect([agent.before, agent.after, agent.direction]).toEqual([
      'haiku',
      'opus',
      'more-expensive',
    ]);
    expect(analysis.rows[0].name).toBe('opus-agent');
    expect(analysis.verdict.id).toBe('changed');
    expect(analysis.verdict.text).toMatch(/^1 of \d+ agents changed at 2\.1\.251$/);
  });

  it('compares their version with what comes after when they are before it', () => {
    const analysis = analyzeFleet(
      input({ agentFiles: [opusAgent], controls: { ...classic, version: v(240) } }),
    );

    expect(analysis.columns.beforeLabel).toBe('On 2.1.240');
    expect(analysis.columns.afterLabel).toBe('After upgrading to 2.1.251');
    expect(analysis.verdict.id).toBe('will-change');
    expect(analysis.verdict.text).toMatch(/^1 of \d+ agents will change when you pass 2\.1\.251$/);
    expect(analysis.summary.movesUp).toBe(1);
  });

  it('says nothing can flip with no env var and no FORCE', () => {
    const analysis = analyzeFleet(input({ agentFiles: [opusAgent], controls: baseConfiguration }));

    expect(analysis.verdict.id).toBe('nothing-can-flip');
  });

  it('says no agent changes when the env var is inherit, which moves nothing at 251', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [opusAgent],
        controls: { ...classic, environmentModel: 'inherit', version: v(278) },
      }),
    );

    expect(analysis.verdict.id).toBe('no-changes');
  });

  it('says FORCE is on, or set but inert, by version', () => {
    const forced = { ...classic, force: true };

    expect(analyzeFleet(input({ controls: { ...forced, version: v(270) } })).verdict.id).toBe(
      'force-on',
    );
    expect(analyzeFleet(input({ controls: { ...forced, version: v(254) } })).verdict.id).toBe(
      'force-inert',
    );
  });

  it('counts Explore, Plan, and general-purpose as rows', () => {
    const analysis = analyzeFleet(input({ controls: { ...classic, version: v(278) } }));

    expect(analysis.rows.map((entry) => entry.name).sort()).toEqual([
      'Explore',
      'Plan',
      'general-purpose',
    ]);
    // The env var overrides general-purpose before 2.1.251 and is its default after, so nothing moves.
    expect(row(analysis, 'general-purpose')[0]).toMatchObject({
      before: 'haiku',
      after: 'haiku',
      changed: false,
    });
    // Explore ignores the env var on both sides.
    expect(row(analysis, 'Explore')[0]).toMatchObject({
      before: 'sonnet',
      after: 'sonnet',
      changed: false,
    });
  });

  it('follows the upgrade planner’s two versions', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [opusAgent],
        controls: { ...classic, version: v(278) },
        comparison: { mode: 'planner', from: '2.1.240', to: '2.1.260' },
      }),
    );

    expect(analysis.columns.before).toEqual(v(240));
    expect(analysis.columns.after).toEqual(v(260));
    expect(analysis.summary.movesUp).toBeGreaterThanOrEqual(1);
    expect(analysis.summary.moved + analysis.summary.unchanged).toBe(analysis.agentCount);
  });

  it('falls back to the version and the latest when the planner’s versions are unreadable', () => {
    const analysis = analyzeFleet(
      input({ controls: classic, comparison: { mode: 'planner', from: 'soon', to: '' } }),
    );

    expect(analysis.columns.after).toEqual(v(289));
    expect(analysis.warnings.some((warning) => warning.source === 'upgrade planner')).toBe(true);
  });
});

describe('where each value comes from', () => {
  const settingsFile = (
    path: string,
    scope: 'user' | 'project' | 'project-local',
    body: object,
  ) => ({
    id: path,
    path,
    scope,
    text: JSON.stringify(body),
  });

  it('prefers the shell, then settings files, then the controls', () => {
    const analysis = analyzeFleet(
      input({
        controls: { ...baseConfiguration, environmentModel: 'fable' },
        settingsFiles: [
          settingsFile('user.json', 'user', { env: { CLAUDE_CODE_SUBAGENT_MODEL: 'haiku' } }),
          settingsFile('local.json', 'project-local', {
            env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet' },
          }),
        ],
      }),
    );

    expect(analysis.context.environmentModel).toBe('sonnet');

    const withShell = analyzeFleet(
      input({
        settingsFiles: [
          settingsFile('local.json', 'project-local', {
            env: { CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet' },
          }),
        ],
        shellEnvironmentText: 'CLAUDE_CODE_SUBAGENT_MODEL=opus',
      }),
    );

    expect(withShell.context.environmentModel).toBe('opus');
  });

  it('treats a missing env var as unset once settings were given, and takes the controls otherwise', () => {
    const settingsOnly = analyzeFleet(
      input({
        controls: { ...baseConfiguration, environmentModel: 'haiku' },
        settingsFiles: [settingsFile('a.json', 'user', { model: 'opus' })],
      }),
    );
    const nothing = analyzeFleet(
      input({ controls: { ...baseConfiguration, environmentModel: 'haiku' } }),
    );

    expect(settingsOnly.context.environmentModel).toBe('unset');
    expect(settingsOnly.context.mainModel).toBe('opus');
    expect(nothing.context.environmentModel).toBe('haiku');
    expect(nothing.assumptions.join(' ')).toContain('from the controls');
  });

  it('reads FORCE values of 0 and false as off', () => {
    const off = analyzeFleet(input({ shellEnvironmentText: 'CLAUDE_CODE_SUBAGENT_MODEL_FORCE=0' }));
    const on = analyzeFleet(input({ shellEnvironmentText: 'CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1' }));

    expect(off.context.force).toBe(false);
    expect(on.context.force).toBe(true);
  });

  it('takes the version from the field, then pasted output, then the controls, and clamps it', () => {
    expect(analyzeFleet(input({ versionText: '2.1.240 (Claude Code)' })).context.version).toEqual(
      v(240),
    );
    expect(analyzeFleet(input({ pastedText: '2.1.230 (Claude Code)' })).context.version).toEqual(
      v(230),
    );
    expect(
      analyzeFleet(input({ versionText: '2.1.230', pastedText: '2.1.250 (Claude Code)' })).context
        .version,
    ).toEqual(v(230));
    expect(analyzeFleet(input({})).assumptions.join(' ')).toContain('No version found');

    const clamped = analyzeFleet(input({ versionText: '2.1.400' }));
    expect(clamped.context.version).toEqual(v(289));
    expect(clamped.assumptions.join(' ')).toContain('outside the range');
    expect(
      analyzeFleet(input({ versionText: 'banana' })).warnings.some((w) => w.source === 'version'),
    ).toBe(true);
  });

  it('leaves the controls alone when pasted output has no environment or FORCE value', () => {
    const controls = { ...baseConfiguration, environmentModel: 'haiku' as const, force: true };
    const analysis = analyzeFleet(
      input({
        controls,
        pastedText: '2.1.250 (Claude Code)\n/Users/me/.claude/agents/a.md:3:model: opus',
      }),
    );

    expect(analysis.context.environmentModel).toBe('haiku');
    expect(analysis.context.force).toBe(true);
    expect(analysis.hasInput).toBe(true);
  });

  it('keeps same-name, same-model pasted definitions that come from different paths', () => {
    const analysis = analyzeFleet(
      input({
        pastedText: [
          '/Users/me/.claude/agents/reviewer.md:3:model: haiku',
          '/Users/me/repo/.claude/agents/reviewer.md:3:model: haiku',
          '/Users/me/repo/.claude/agents/reviewer.md:3:model: haiku',
        ].join('\n'),
      }),
    );

    expect(row(analysis, 'reviewer')).toHaveLength(2);
  });

  it('keeps a pasted definition from another scope so precedence can decide', () => {
    const analysis = analyzeFleet(
      input({
        pastedText: '/etc/claude-code/.claude/agents/reviewer.md:3:model: haiku',
        agentFiles: [
          agentFile('r', 'repo/.claude/agents/reviewer.md', ['name: reviewer', 'model: opus']),
        ],
      }),
    );
    const rows = row(analysis, 'reviewer');

    expect(rows).toHaveLength(2);
    expect(rows.find((entry) => entry.definition?.source === 'paste')?.status.kind).toBe(
      'effective',
    );
    expect(rows.find((entry) => entry.definition?.source === 'upload')?.status.kind).toBe(
      'shadowed',
    );
  });

  it('reads agents from pasted output unless an uploaded file has the same name and scope', () => {
    const pasted = analyzeFleet(
      input({ pastedText: '/Users/me/.claude/agents/reviewer.md:3:model: haiku' }),
    );
    const both = analyzeFleet(
      input({
        pastedText: '/Users/me/.claude/agents/reviewer.md:3:model: haiku',
        agentFiles: [
          agentFile('r', 'home/.claude/agents/reviewer.md', ['name: reviewer', 'model: opus']),
        ],
      }),
    );

    expect(row(pasted, 'reviewer')[0].definition?.source).toBe('paste');
    expect(row(pasted, 'reviewer')[0].scopeLabel).toBe('User');
    expect(row(both, 'reviewer')).toHaveLength(1);
    expect(row(both, 'reviewer')[0].definition?.source).toBe('upload');
  });

  it('reads agents from the --agents flag as the second-highest scope', () => {
    const analysis = analyzeFleet(
      input({
        cliAgentsText: '{"reviewer": {"description": "x", "model": "haiku"}}',
        agentFiles: [
          agentFile('p', 'repo/.claude/agents/reviewer.md', ['name: reviewer', 'model: opus']),
        ],
      }),
    );
    const byId = Object.fromEntries(
      row(analysis, 'reviewer').map((entry) => [entry.definition?.id, entry]),
    );

    expect(byId['cli:reviewer'].status).toEqual({ kind: 'effective' });
    expect(byId.p.shadowedBy?.id).toBe('cli:reviewer');
    expect(analyzeFleet(input({ cliAgentsText: '[1]' })).warnings).toHaveLength(1);
  });

  it('warns about a file it can’t read without failing', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [{ id: 'x', batch: 0, path: 'agents/bad.md', text: 'no frontmatter at all' }],
        settingsFiles: [{ id: 's', path: 'settings.json', scope: 'user', text: '{{' }],
      }),
    );

    expect(analysis.warnings.map((warning) => warning.source)).toEqual([
      'settings.json',
      'agents/bad.md',
    ]);
    expect(analysis.rows.some((entry) => entry.name === 'bad')).toBe(true);
  });

  it('handles an empty agents folder and many agents', () => {
    expect(analyzeFleet(input({ agentFiles: [] })).rows).toHaveLength(3);

    const many = Array.from({ length: 250 }, (_, index) =>
      agentFile(`a${index}`, `repo/.claude/agents/agent-${index}.md`, [
        `name: agent-${index}`,
        'model: opus',
      ]),
    );
    const analysis = analyzeFleet(
      input({ agentFiles: many, controls: { ...baseConfiguration, environmentModel: 'haiku' } }),
    );

    expect(analysis.rows).toHaveLength(253);
    expect(analysis.agentCount).toBe(253);
  });
});

describe('configurationForRow', () => {
  it('loads the row’s kind and declared model along with the fleet’s context', () => {
    const analysis = analyzeFleet(
      input({
        agentFiles: [agentFile('x', 'repo/.claude/agents/x.md', ['name: x', 'model: opus'])],
        controls: { ...baseConfiguration, environmentModel: 'haiku', mainModel: 'fable' },
      }),
    );
    const configuration = configurationForRow(row(analysis, 'x')[0], analysis, baseConfiguration);

    expect(configuration).toMatchObject({
      kind: 'custom',
      definitionModel: 'opus',
      environmentModel: 'haiku',
      mainModel: 'fable',
    });
    expect(configurationForRow(row(analysis, 'Explore')[0], analysis, baseConfiguration).kind).toBe(
      'explore',
    );
  });
});
