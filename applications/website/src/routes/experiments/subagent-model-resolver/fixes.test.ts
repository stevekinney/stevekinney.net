import { describe, expect, it } from 'vitest';

import { diffPreview, suggestFix } from './fixes';
import { analyzeFleet } from './fleet';
import type { FleetInput } from './fleet';
import { defaultSettingsPrecedence } from './effective-settings';
import { buildCsv, buildMarkdownReport, csvField, escapeMarkdownCell } from './export-report';
import { baseConfiguration } from './presets';
import { defaultRange, v } from './versions';

const agentText = (frontmatter: string[]): string =>
  ['---', ...frontmatter, '---', '', 'Prompt.', ''].join('\n');

const analysisFor = (overrides: Partial<FleetInput> = {}) =>
  analyzeFleet({
    agentFiles: [
      {
        id: 'a',
        batch: 0,
        path: 'repo/.claude/agents/opus.md',
        text: agentText(['name: opus-agent', 'model: opus']),
      },
      { id: 'b', batch: 0, path: 'repo/.claude/agents/quiet.md', text: agentText(['name: quiet']) },
    ],
    agentScopes: {},
    settingsFiles: [],
    settingsPrecedence: defaultSettingsPrecedence,
    cliAgentsText: '',
    workingDirectory: '',
    shellEnvironmentText: '',
    pastedText: '',
    versionText: '',
    controls: {
      ...baseConfiguration,
      environmentModel: 'haiku',
      mainModel: 'sonnet',
      version: v(278),
    },
    range: defaultRange,
    comparison: { mode: 'boundary' },
    ...overrides,
  });

describe('diffPreview', () => {
  it('shows a changed line with two lines of context', () => {
    const before = ['---', 'name: a', 'description: b', 'model: haiku', 'tools: x', '---'].join(
      '\n',
    );
    const after = before.replace('haiku', 'opus');

    expect(diffPreview(before, after)).toEqual([
      { kind: 'context', text: 'name: a' },
      { kind: 'context', text: 'description: b' },
      { kind: 'remove', text: 'model: haiku' },
      { kind: 'add', text: 'model: opus' },
      { kind: 'context', text: 'tools: x' },
      { kind: 'context', text: '---' },
    ]);
  });

  it('shows an added line', () => {
    expect(diffPreview('a\nb\nc', 'a\nb\nnew\nc')).toEqual([
      { kind: 'context', text: 'a' },
      { kind: 'context', text: 'b' },
      { kind: 'add', text: 'new' },
      { kind: 'context', text: 'c' },
    ]);
  });
});

describe('suggestFix', () => {
  it('pins the model the agent ran on before, by editing its model line', () => {
    const analysis = analysisFor();
    const row = analysis.rows.find((entry) => entry.name === 'opus-agent');
    if (!row) throw new Error('missing row');
    const fix = suggestFix(row, analysis);

    expect(fix.intended).toBe('haiku');
    expect(fix.editInstruction).toBe(
      'Change `model: opus` to `model: haiku` in `repo/.claude/agents/opus.md`.',
    );
    expect(fix.editWorks).toBe(true);
    expect(fix.patch?.fileName).toBe('opus.md');
    expect(fix.patch?.contents).toContain('model: haiku');
    expect(
      fix.patch?.diff.some((line) => line.kind === 'remove' && line.text === 'model: opus'),
    ).toBe(true);
    expect(fix.forceInstruction).toContain('CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1');
  });

  it('adds a model line to an agent that has none, and lets the person choose the model', () => {
    const analysis = analysisFor();
    const row = analysis.rows.find((entry) => entry.name === 'quiet');
    if (!row) throw new Error('missing row');
    const fix = suggestFix(row, analysis, 'opus');

    expect(fix.editInstruction).toBe(
      'Add `model: opus` to the frontmatter of `repo/.claude/agents/quiet.md`.',
    );
    expect(fix.patch?.contents).toContain('model: opus');
    expect(fix.patch?.diff.some((line) => line.kind === 'add' && line.text === 'model: opus')).toBe(
      true,
    );
  });

  it('says so when FORCE would ignore the edit, and omits FORCE before 2.1.257', () => {
    const forced = analysisFor({
      controls: { ...baseConfiguration, environmentModel: 'haiku', force: true, version: v(270) },
    });
    const row = forced.rows.find((entry) => entry.name === 'opus-agent');
    if (!row) throw new Error('missing row');

    expect(suggestFix(row, forced, 'fable').editWorks).toBe(false);
    expect(suggestFix(row, forced, 'fable').editProblem).toContain('FORCE is on');

    const early = analysisFor({
      controls: { ...baseConfiguration, environmentModel: 'haiku', version: v(240) },
    });
    const earlyRow = early.rows.find((entry) => entry.name === 'opus-agent');
    if (!earlyRow) throw new Error('missing row');
    const fix = suggestFix(earlyRow, early);

    expect(fix.forceInstruction).toBeNull();
    expect(fix.forceUnavailable).toContain('2.1.257');
  });

  it('offers a new definition, not a patch, for a built-in', () => {
    const analysis = analysisFor({
      controls: {
        ...baseConfiguration,
        mainModel: 'fable',
        environmentModel: 'haiku',
        version: v(278),
      },
    });
    const row = analysis.rows.find((entry) => entry.name === 'Explore');
    if (!row) throw new Error('missing row');
    const fix = suggestFix(row, analysis, 'haiku');

    expect(fix.patch).toBeNull();
    expect(fix.noPatchReason).toContain('built-in');
    expect(fix.editInstruction).toContain('model: haiku');
  });

  it('offers no patch for an agent read from pasted output', () => {
    const analysis = analysisFor({
      agentFiles: [],
      pastedText: '/Users/me/.claude/agents/pasted.md:3:model: opus',
    });
    const row = analysis.rows.find((entry) => entry.name === 'pasted');
    if (!row) throw new Error('missing row');

    expect(suggestFix(row, analysis).patch).toBeNull();
    expect(suggestFix(row, analysis).noPatchReason).toContain('pasted');
  });
});

describe('export', () => {
  it('quotes CSV fields and defuses formulas', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvField('+1')).toBe("'+1");
    expect(csvField('-1')).toBe("'-1");
    expect(csvField('@sum')).toBe("'@sum");
    expect(csvField('two\nlines')).toBe('"two\nlines"');
  });

  it('writes one CSV row per agent under a header', () => {
    const lines = buildCsv(analysisFor()).trim().split('\r\n');

    expect(lines[0]).toBe(
      'agent,scope,declares,resolves 2.1.250,resolves 2.1.278,change,status,path',
    );
    expect(lines).toHaveLength(1 + analysisFor().rows.length);
    expect(lines.find((line) => line.startsWith('opus-agent'))).toContain('haiku → opus');
  });

  it('escapes Markdown in names so they cannot add formatting or break a table', () => {
    expect(escapeMarkdownCell('a|b')).toBe('a\\|b');
    expect(escapeMarkdownCell('[x](https://example.com) `code` <b>')).toBe(
      '\\[x\\](https://example.com) \\`code\\` \\<b\\>',
    );
    expect(escapeMarkdownCell('two\nlines')).toBe('two lines');
  });

  it('writes a report with the verdict, assumptions, table, and edits', () => {
    const report = buildMarkdownReport(analysisFor());

    expect(report).toContain('# Subagent model audit');
    expect(report).toContain('**Verdict:**');
    expect(report).toContain('## Assumptions');
    expect(report).toContain('| Agent | Scope | Declares | Before 2.1.251 | On 2.1.278 | Change |');
    expect(report).toContain('opus-agent');
    expect(report).toContain('Change `model: opus` to `model: haiku`');
    expect(report).toContain('/tasks');
  });
});
