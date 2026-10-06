import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';

import {
  blankDocument,
  keptAsIs,
  notWrittenFor,
  sampleDocument,
  switchTarget,
  writeToolList,
  writeValue,
} from './document';
import type { AgentDocument } from './document';
import { ownChecks } from './checks';
import {
  asSkillsTable,
  disableRule,
  setBundledOff,
  setInstructionsOff,
  setRuleMatch,
  setRuleTarget,
  skillRules,
  withRules,
} from './codex-skills';
import { fieldDefinitions } from './fields';
import type { FieldDefinition } from './fields';
import {
  buildReport,
  parseStructured,
  readAgentFile,
  structuredDrafts,
  structuredText,
} from './workbench';

const field = (target: 'claude' | 'codex', key: string): FieldDefinition => {
  const found = fieldDefinitions.find(
    (definition) => definition.target === target && definition.key === key,
  );
  if (!found) throw new Error(`No field ${target}.${key}`);

  return found;
};

const load = (path: string, text: string) => {
  const loaded = readAgentFile(path, text);
  if (!loaded.ok) throw new Error(loaded.message);

  return loaded;
};

const claudeFile = `---
# Reviews pull requests before they merge.
name: pr-reviewer
description: "Reviews a pull request for bugs and missing tests. Use before merging; not for writing code."
tools: Read, Grep, Glob
model: opus
permissionMode: plan
background: "true"
maxTurns: 25
team: platform # Not a Claude Code field.
experimental:
  cacheTtl: 1h
---

Review the pull request and report findings with file and line references.
`;

const codexFile = `# A Codex agent with keys Codex reads from config.toml.
name = "docs-writer"
description = "Writes and updates documentation for changed code."
model = "gpt-6.1-sol"
model_reasoning_effort = "medium"
sandbox_mode = "workspace-write"
approval_policy = "on-request"
developer_instructions = """
Update the docs for every public function the change touches.
Keep \\"examples\\" runnable.
"""

[mcp_servers.docs]
command = "npx"
args = ["-y", "docs-server"]

[shell_environment_policy]
inherit = "core"
`;

describe('the sample', () => {
  it('passes every Claude Code check with nothing to fix', () => {
    const report = buildReport(sampleDocument(), 'claude');

    expect(report.issues).toEqual([]);
    expect(report.fieldIssues).toEqual({});
    expect(report.fileName).toBe('code-reviewer.md');
    expect(report.text).toMatch(/^---\nname: code-reviewer\ndescription: Reviews/);
    expect(report.text).toContain('tools:\n  - Read\n  - Grep\n  - Glob\nmodel: sonnet\n---\n');
  });

  it('passes every Codex check once switched, with nothing that has no effect', () => {
    const document = switchTarget(sampleDocument(), 'codex');
    const report = buildReport(document, 'codex');

    expect(report.issues).toEqual([]);
    expect(report.fieldIssues).toEqual({});
    expect(report.fileName).toBe('code-reviewer.toml');
    expect(parse(report.text)).toMatchObject({
      name: 'code-reviewer',
      developer_instructions: document.body,
    });
    expect(report.text).not.toContain('sandbox_mode');
    expect(report.text).toContain("developer_instructions = '''\nYou review code changes.");
  });
});

describe('loading and exporting a Claude Code agent', () => {
  it('writes an untouched file back byte for byte', () => {
    const { document, source } = load('.claude/agents/pr-reviewer.md', claudeFile);

    expect(buildReport(document, 'claude', source).text).toBe(claudeFile);
  });

  it('keeps comments and the other keys when one field changes', () => {
    const { document, source } = load('pr-reviewer.md', claudeFile);
    const edited = writeValue(document, 'claude', 'permissionMode', 'default');
    const text = buildReport(edited, 'claude', source).text;

    expect(text).toBe(claudeFile.replace('permissionMode: plan', 'permissionMode: default'));
  });

  it('reads the shared fields, the target, and the file name', () => {
    const loaded = load('agents/pr-reviewer.md', claudeFile);

    expect(loaded.target).toBe('claude');
    expect(loaded.document).toMatchObject({
      fileName: 'pr-reviewer',
      name: 'pr-reviewer',
      model: 'opus',
      body: 'Review the pull request and report findings with file and line references.\n',
    });
    expect(loaded.document.claude['background']).toBe('true');
    expect(keptAsIs(loaded.document, 'claude')).toEqual(['team']);
  });

  it('reports a file whose frontmatter is not YAML and changes nothing', () => {
    const loaded = readAgentFile('broken.md', '---\nname: [unclosed\n---\nBody\n');

    expect(loaded).toMatchObject({ ok: false });
    expect(loaded.ok ? '' : loaded.message).toMatch(/isn't valid YAML/);
  });
});

describe('loading and exporting a Codex agent', () => {
  it('writes the same table back, unknown config.toml keys included', () => {
    const { document, target } = load('.codex/agents/docs-writer.toml', codexFile);
    const report = buildReport(document, 'codex');

    expect(target).toBe('codex');
    expect(parse(report.text)).toEqual(parse(codexFile));
    expect(keptAsIs(document, 'codex')).toEqual(['approval_policy', 'shell_environment_policy']);
    expect(report.issues).toEqual([]);
  });

  it('reports a file that is not TOML', () => {
    expect(readAgentFile('broken.toml', 'name = "unterminated')).toMatchObject({ ok: false });
  });
});

describe('switching targets', () => {
  const withEffort = (effort: unknown): AgentDocument =>
    writeValue(sampleDocument(), 'claude', 'effort', effort);

  it('copies a Claude Code effort level to Codex and marks it as copied', () => {
    const switched = switchTarget(withEffort('high'), 'codex');

    expect(switched.codex['model_reasoning_effort']).toBe('high');
    expect(switched.derived).toEqual(['codex.model_reasoning_effort']);
  });

  it('follows the Claude Code value again while the copy is untouched', () => {
    const first = switchTarget(withEffort('high'), 'codex');
    const changed = writeValue(switchTarget(first, 'claude'), 'claude', 'effort', 'low');

    expect(switchTarget(changed, 'codex').codex['model_reasoning_effort']).toBe('low');
  });

  it('keeps a Codex effort the person set', () => {
    const set = writeValue(withEffort('high'), 'codex', 'model_reasoning_effort', 'minimal');
    const switched = switchTarget(set, 'codex');

    expect(switched.codex['model_reasoning_effort']).toBe('minimal');
    expect(switched.derived).toEqual([]);
  });

  it('leaves a whole-number budget and a Codex-only level behind', () => {
    expect(switchTarget(withEffort(4000), 'codex').codex).not.toHaveProperty(
      'model_reasoning_effort',
    );

    const codexOnly = writeValue(blankDocument(), 'codex', 'model_reasoning_effort', 'minimal');
    expect(switchTarget(codexOnly, 'claude').claude).not.toHaveProperty('effort');
  });

  it('never drops the other tool’s settings, and lists what the export leaves out', () => {
    const document = switchTarget(sampleDocument(), 'codex');

    expect(document.claude['tools']).toEqual(['Read', 'Grep', 'Glob']);
    expect(notWrittenFor(document, 'codex')).toEqual(['tools']);
    expect(notWrittenFor(document, 'claude')).toEqual([]);
    expect(
      notWrittenFor(writeValue(document, 'codex', 'sandbox_mode', 'read-only'), 'claude'),
    ).toEqual(['sandbox_mode']);
    expect(switchTarget(document, 'claude').claude).toEqual(sampleDocument().claude);
  });
});

describe('field issues', () => {
  it('maps Claude Code schema problems to their fields', () => {
    let document = sampleDocument();
    document = writeValue(document, 'claude', 'maxTurns', 'ten');
    document = writeValue(document, 'claude', 'permissionMode', 'yolo');
    document = writeValue(document, 'claude', 'experimental.cacheTtl', '2h');
    document = writeValue(document, 'claude', 'background', 'yes');
    const report = buildReport(document, 'claude');

    expect(Object.keys(report.fieldIssues).sort()).toEqual([
      'claude.background',
      'claude.experimental.cacheTtl',
      'claude.maxTurns',
      'claude.permissionMode',
    ]);
    expect(report.issues.some((issue) => issue.severity === 'error')).toBe(true);
  });

  it('warns about an MCP server item Claude Code would drop, naming the bad field', () => {
    const document = writeValue(sampleDocument(), 'claude', 'mcpServers', [
      'github',
      { docs: { type: 'http', url: 5 } },
    ]);
    const issues = buildReport(document, 'claude').fieldIssues['claude.mcpServers'] ?? [];

    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toMatch(/^Item 2 \(`docs\.url`: .*expected string/);
  });

  it('reports a name that does not match the file name as skillset does', () => {
    const document = { ...sampleDocument(), fileName: 'reviewer' };
    const messages = buildReport(document, 'claude').issues.map((issue) => issue.message);

    expect(messages).toContain('name `code-reviewer` must match its filename `reviewer.md`');
  });

  it('maps Codex schema problems to fields and the verdict', () => {
    let document = sampleDocument();
    document = writeValue(document, 'codex', 'nickname_candidates', ['Ada', 'Ada']);
    document = writeValue(document, 'codex', 'sandbox_mode', 'none');
    const report = buildReport(document, 'codex');

    expect(Object.keys(report.fieldIssues).sort()).toEqual([
      'codex.nickname_candidates',
      'codex.sandbox_mode',
    ]);
    expect(report.issues.filter((issue) => issue.severity === 'error')).toHaveLength(2);
  });

  it('puts this page’s Codex rules in the verdict as warnings', () => {
    const document = writeValue(
      { ...blankDocument(), name: 'Docs Writer', body: 'Write docs.' },
      'codex',
      'sandbox_mode',
      'danger-full-access',
    );
    const report = buildReport(document, 'codex');

    expect(report.issues.map((issue) => issue.severity)).toEqual(['warning', 'warning', 'warning']);
  });
});

describe('structured fields', () => {
  it('writes and reads a Codex table with its header', () => {
    const mcp = field('codex', 'mcp_servers');
    const value = { docs: { command: 'npx', args: ['-y', 'docs-server'] } };
    const text = structuredText(mcp, value);

    expect(text).toMatch(/^\[mcp_servers\.docs\]/);
    expect(parseStructured(mcp, text)).toEqual({ ok: true, value });
  });

  it('asks for the key prefix when a Codex table leaves it out', () => {
    const result = parseStructured(field('codex', 'mcp_servers'), '[docs]\ncommand = "npx"');

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.message).toMatch(/Found: `docs`/);
  });

  it('reads YAML for Claude Code and reports YAML errors', () => {
    const hooks = field('claude', 'hooks');

    expect(parseStructured(hooks, 'PreToolUse:\n  - hooks: []')).toEqual({
      ok: true,
      value: { PreToolUse: [{ hooks: [] }] },
    });
    expect(parseStructured(hooks, 'PreToolUse: [unclosed')).toMatchObject({ ok: false });
    expect(parseStructured(hooks, '  ')).toEqual({ ok: true, value: undefined });
  });

  it('fills the text of every structured field a loaded file sets', () => {
    const { document } = load('docs-writer.toml', codexFile);

    expect(Object.keys(structuredDrafts(document))).toEqual(['codex.mcp_servers']);
  });
});

describe('tool lists', () => {
  it('writes a comma-separated tools string back as a string', () => {
    const { document, source } = load('pr-reviewer.md', claudeFile);
    const tools = writeToolList(document.claude['tools'], ['Read', 'Grep', 'Glob', 'Edit']);
    const text = buildReport(writeValue(document, 'claude', 'tools', tools), 'claude', source).text;

    expect(text).toBe(
      claudeFile.replace('tools: Read, Grep, Glob', 'tools: Read, Grep, Glob, Edit'),
    );
  });

  it('writes a new list, or one read as a list, as a YAML list', () => {
    expect(writeToolList(undefined, ['Bash'])).toEqual(['Bash']);
    expect(writeToolList(['Read'], ['Read', 'Edit'])).toEqual(['Read', 'Edit']);

    const document = writeValue(
      sampleDocument(),
      'claude',
      'disallowedTools',
      writeToolList(undefined, ['Bash']),
    );
    expect(buildReport(document, 'claude').text).toContain('disallowedTools:\n  - Bash\n');
  });

  it('removes the key when the list is empty', () => {
    const { document, source } = load('pr-reviewer.md', claudeFile);
    const text = buildReport(
      writeValue(document, 'claude', 'tools', writeToolList(document.claude['tools'], [])),
      'claude',
      source,
    ).text;

    expect(text).not.toContain('tools:');
  });
});

describe('Codex skill rules', () => {
  const withSkills = (skills: unknown): AgentDocument =>
    writeValue(switchTarget(sampleDocument(), 'codex'), 'codex', 'skills', skills);

  it('writes a new disable rule as [[skills.config]] and passes the checks', () => {
    const rules = [setRuleTarget(disableRule('name'), 'deploy')];
    const document = withSkills(withRules({}, rules));
    const report = buildReport(document, 'codex');

    expect(report.text).toContain('[[skills.config]]\nname = "deploy"\nenabled = false');
    expect(report.issues).toEqual([]);
    expect(parse(report.text)['skills']).toEqual({ config: [{ name: 'deploy', enabled: false }] });
  });

  it('switches a rule to match by path, keeping its value', () => {
    const rule = setRuleMatch({ name: 'deploy', enabled: false }, 'path');

    expect(rule).toEqual({ path: 'deploy', enabled: false });
  });

  it('writes the bundled and instructions switches, and clears them to nothing', () => {
    const on = setInstructionsOff(asSkillsTable(setBundledOff({}, true)), true);
    const report = buildReport(withSkills(on), 'codex');

    expect(parse(report.text)['skills']).toEqual({
      bundled: { enabled: false },
      include_instructions: false,
    });
    expect(setBundledOff(asSkillsTable(setInstructionsOff(asSkillsTable(on), false)), false)).toBe(
      undefined,
    );
  });

  it('round-trips a loaded [skills] table, enabled = true rules and other keys included', () => {
    const file = `${codexFile.split('\n[mcp_servers.docs]')[0]}
[skills]
max_context_tokens = 2000
include_instructions = true

[[skills.config]]
path = "skills/legacy"
enabled = true

[[skills.config]]
name = "deploy"
enabled = false
`;
    const { document } = load('docs-writer.toml', file);
    const skills = asSkillsTable(document.codex['skills']);

    expect(skillRules(skills)).toHaveLength(2);
    expect(parse(buildReport(document, 'codex').text)['skills']).toEqual(parse(file)['skills']);

    const messages = ownChecks(document, 'codex')
      .filter((issue) => issue.field === 'codex.skills')
      .map((issue) => issue.message);
    expect(messages).toEqual([
      expect.stringContaining('Skill rule 1 doesn’t set `enabled = false`'),
      expect.stringContaining('`include_instructions = true` has no effect'),
    ]);
  });

  it('flags a rule that names nothing in the verdict', () => {
    const report = buildReport(withSkills(withRules({}, [disableRule('path')])), 'codex');

    expect(report.issues).toEqual([
      { severity: 'warning', message: 'Skill rule 1 has no `path`, so it turns nothing off.' },
    ]);
  });
});

describe('a tools list Claude Code can’t launch', () => {
  it('puts a list where nothing is a tool in the verdict as an error', () => {
    const { document } = load(
      'spaced.md',
      '---\nname: spaced\ndescription: Reviews code.\ntools: Read Grep\n---\n\nYou review code.\n',
    );
    const launch = ownChecks(document, 'claude').find(
      (issue) => issue.field === 'claude.tools' && issue.severity === 'error',
    );

    expect(launch?.verdict).toBe(true);
    expect(launch?.message).toContain('won’t launch');
  });
});
