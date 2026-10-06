import { describe, expect, it } from 'vitest';

import { sampleSkill } from './sample-skill';
import { blankDocument, notWrittenFor, unknownKeys } from './skill-document';
import type { SkillDocument } from './skill-document';
import {
  addDependency,
  applyDraft,
  fields,
  removeDependency,
  setDependency,
  writeField,
} from './skill-fields';
import type { FieldDefinition } from './skill-fields';
import { analyzeSkill, exportSkill, parseDraft, readSkillFiles } from './workbench';

// A file a person might really have: a comment, a quoted value, a tool list
// written as one string, a `yes` boolean, metadata, and a key neither tool reads.
const handWritten = `---
name: pdf-forms # matches the folder
description: Fills in PDF forms and lists their fields. Use when someone mentions a PDF form or asks to fill one in.
allowed-tools: Read, Bash(python3:*)
disable-model-invocation: yes
x-team: documents
metadata:
  short-description: "Fill PDF forms"
  version: "2"
---

# PDF forms

Run \`python3 scripts/fill.py\` with the form and the values.
`;

const openaiYaml = `interface:
  display_name: PDF forms # shown in the app
  brand_color: "#2563EB"
policy:
  allow_implicit_invocation: false
`;

const load = (
  skill: string,
  options: { openai?: string; directoryName?: string | null } = {},
): SkillDocument => {
  const result = readSkillFiles({
    skill: { path: 'SKILL.md', text: skill },
    openai: options.openai ? { path: 'agents/openai.yaml', text: options.openai } : null,
    directoryName: options.directoryName ?? null,
  });
  if (!result.ok) throw new Error(result.message);

  return result.document;
};

const field = (key: string): FieldDefinition => {
  const found = fields.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`No field ${key}`);

  return found;
};

const skillText = (skill: SkillDocument, target: 'claude' | 'codex'): string =>
  exportSkill(skill, target)[0]?.text ?? '';

describe('the sample', () => {
  it('passes Claude Code’s checks with no errors or warnings', () => {
    const results = analyzeSkill(load(sampleSkill), 'claude');

    expect(results.issues).toEqual([]);
    expect(results.valid).toBe(true);
    expect(results.fieldIssues).toEqual({});
  });

  it('exports unchanged, byte for byte', () => {
    expect(skillText(load(sampleSkill), 'claude')).toBe(sampleSkill);
  });

  it('exports to a folder named after the skill', () => {
    expect(exportSkill(load(sampleSkill), 'claude').map((file) => file.path)).toEqual([
      'release-notes/SKILL.md',
    ]);
  });
});

describe('round trips', () => {
  it('writes an untouched hand-written SKILL.md back byte for byte', () => {
    expect(skillText(load(handWritten), 'claude')).toBe(handWritten);
  });

  it('writes an untouched agents/openai.yaml back byte for byte', () => {
    const files = exportSkill(load(handWritten, { openai: openaiYaml }), 'codex');

    expect(files.map((file) => file.path)).toEqual([
      'pdf-forms/SKILL.md',
      'pdf-forms/agents/openai.yaml',
    ]);
    expect(files[1]?.text).toBe(openaiYaml);
  });

  it('changes only the edited line, keeping comments and the other values', () => {
    const edited = writeField(load(handWritten), field('description'), 'Fills in PDF forms.');
    const text = skillText(edited, 'claude');

    expect(text).toContain('name: pdf-forms # matches the folder\n');
    expect(text).toContain('description: Fills in PDF forms.\n');
    expect(text).toContain('allowed-tools: Read, Bash(python3:*)\n');
    expect(text).toContain('disable-model-invocation: yes\n');
  });

  it('keeps a tool list written as one string a string when a tool is added', () => {
    const edited = writeField(load(handWritten), field('allowed-tools'), [
      'Read',
      'Bash(python3:*)',
      'Grep',
    ]);

    expect(skillText(edited, 'claude')).toContain('allowed-tools: Read, Bash(python3:*), Grep\n');
  });

  it('writes a real boolean once a boolean is changed', () => {
    const edited = writeField(load(handWritten), field('disable-model-invocation'), 'false');

    expect(skillText(edited, 'claude')).toContain('disable-model-invocation: false\n');
  });

  it('writes a whole-number effort as a number', () => {
    const edited = writeField(load(sampleSkill), field('effort'), '2048');

    expect(skillText(edited, 'claude')).toContain('effort: 2048\n');
    expect(analyzeSkill(edited, 'claude').fieldIssues.effort).toBeUndefined();
  });

  it('writes new keys in field order, not the order they were set', () => {
    let skill = blankDocument();
    skill = writeField(skill, field('description'), 'Formats SQL. Use when asked to tidy a query.');
    skill = writeField(skill, field('name'), 'format-sql');

    expect(skillText(skill, 'claude')).toMatch(/^---\nname: format-sql\ndescription: /);
  });
});

describe('targets', () => {
  it('leaves Claude-only keys out of a Codex export and says which', () => {
    const skill = load(handWritten);
    const codex = skillText(skill, 'codex');

    expect(codex).not.toContain('disable-model-invocation');
    expect(codex).toContain('x-team: documents');
    expect(codex).toContain('allowed-tools: Read, Bash(python3:*)');
    expect(codex).toContain('short-description: "Fill PDF forms"');
    expect(notWrittenFor(skill, 'codex')).toEqual(['disable-model-invocation']);
  });

  it('keeps keys neither tool reads in both exports and lists them', () => {
    const skill = load(handWritten);

    expect(unknownKeys(skill)).toEqual(['x-team']);
    expect(skillText(skill, 'claude')).toContain('x-team: documents');
    expect(skillText(skill, 'codex')).toContain('x-team: documents');
  });

  it('writes agents/openai.yaml for Codex only once one of its fields is set', () => {
    const sample = load(sampleSkill);
    expect(exportSkill(sample, 'codex')).toHaveLength(1);

    const named = writeField(sample, field('interface.display_name'), 'Release notes');
    const files = exportSkill(named, 'codex');
    expect(files[1]?.text).toBe('interface:\n  display_name: Release notes\n');
    expect(exportSkill(named, 'claude')).toHaveLength(1);
    expect(notWrittenFor(named, 'claude')).toEqual(['agents/openai.yaml']);
  });

  it('detects the target from what was loaded', () => {
    const loadTarget = (skill: string, openai?: string) => {
      const result = readSkillFiles({
        skill: { path: 'SKILL.md', text: skill },
        openai: openai ? { path: 'agents/openai.yaml', text: openai } : null,
        directoryName: null,
      });

      return result.ok ? result.target : 'failed';
    };

    expect(loadTarget(handWritten)).toBe('claude');
    expect(loadTarget(handWritten, openaiYaml)).toBe('codex');
    expect(loadTarget('---\nname: a\ndescription: Does a.\n---\n')).toBeNull();
  });
});

describe('loading', () => {
  it('folds the undocumented disallowedTools alias into disallowed-tools', () => {
    const result = readSkillFiles({
      skill: {
        path: 'SKILL.md',
        text: '---\nname: a\ndisallowed-tools: Write\ndisallowedTools:\n  - WebFetch\n---\nBody\n',
      },
      openai: null,
      directoryName: null,
    });

    expect(result.ok && result.foldedAlias).toBe(true);
    expect(result.ok && result.document.frontmatter).toEqual({
      name: 'a',
      'disallowed-tools': ['Write', 'WebFetch'],
    });
  });

  it('takes the alias’s place when disallowed-tools is absent', () => {
    const result = readSkillFiles({
      skill: { path: 'SKILL.md', text: '---\nname: a\ndisallowedTools: Write\nmodel: opus\n---\n' },
      openai: null,
      directoryName: null,
    });

    expect(result.ok && Object.keys(result.document.frontmatter)).toEqual([
      'name',
      'disallowed-tools',
      'model',
    ]);
  });

  it('reports a file that doesn’t parse instead of loading it', () => {
    const result = readSkillFiles({
      skill: { path: 'broken/SKILL.md', text: '---\nname: [unclosed\n---\n' },
      openai: null,
      directoryName: null,
    });

    expect(result).toEqual({ ok: false, message: expect.stringContaining('broken/SKILL.md') });
  });

  it('reports an agents/openai.yaml that isn’t a mapping', () => {
    const result = readSkillFiles({
      skill: { path: 'SKILL.md', text: sampleSkill },
      openai: { path: 'agents/openai.yaml', text: '- a\n- b\n' },
      directoryName: null,
    });

    expect(result.ok).toBe(false);
  });

  it('reads a lone openai.yaml into the current skill', () => {
    const current = load(sampleSkill);
    const result = readSkillFiles(
      { skill: null, openai: { path: 'openai.yaml', text: openaiYaml }, directoryName: null },
      current,
    );

    expect(result.ok && result.document.frontmatter).toEqual(current.frontmatter);
    expect(result.ok && result.document.openai).toEqual({
      interface: { display_name: 'PDF forms', brand_color: '#2563EB' },
      policy: { allow_implicit_invocation: false },
    });
    expect(result.ok && result.target).toBe('codex');
  });

  it('fills the structured fields’ YAML from the file, short description apart', () => {
    const skill = load(
      `---\nname: a\nhooks:\n  Stop:\n    - hooks:\n        - type: command\n          command: echo done\nmetadata:\n  short-description: A\n  version: "2"\n---\n`,
    );

    expect(skill.drafts.metadata).toBe('version: "2"\n');
    expect(skill.drafts.hooks).toContain('command: echo done');
  });
});

describe('structured fields', () => {
  it('parses YAML drafts into values of the right shape', () => {
    expect(parseDraft('metadata', 'version: "2"')).toEqual({ ok: true, value: { version: '2' } });
    expect(parseDraft('metadata', '')).toEqual({ ok: true, value: undefined });
    expect(parseDraft('metadata', '- a').ok).toBe(false);
    expect(parseDraft('metadata', 'short-description: x').ok).toBe(false);
    expect(parseDraft('hooks', 'Stop: [').ok).toBe(false);
  });

  it('keeps the short description when the metadata draft changes', () => {
    const skill = load(handWritten);
    const parsed = parseDraft('metadata', 'version: "3"\nowner: docs');
    const edited = applyDraft(skill, 'metadata', 'version: "3"\nowner: docs', parsed);

    expect(edited.frontmatter.metadata).toEqual({
      'short-description': 'Fill PDF forms',
      version: '3',
      owner: 'docs',
    });
  });
});

describe('validation', () => {
  it('puts schema problems on the field they’re about', () => {
    let skill = load(sampleSkill);
    skill = writeField(skill, field('effort'), 'lots');
    skill = writeField(skill, field('context'), 'sideways');
    skill = applyDraft(skill, 'hooks', '', {
      ok: true,
      value: { PreToolUse: [{ hooks: [{ type: 'command' }] }] },
    });

    const { fieldIssues, valid } = analyzeSkill(skill, 'claude');

    expect(valid).toBe(false);
    expect(fieldIssues.effort?.[0]?.message).toBe(
      'Use `low`, `medium`, `high`, `xhigh`, or `max`, or a whole number.',
    );
    expect(fieldIssues.context?.[0]?.severity).toBe('error');
    expect(fieldIssues.hooks?.[0]?.message).toMatch(/^`PreToolUse\[0\]\.hooks\[0\]\.command`: /);
  });

  it('says what Codex requires', () => {
    const skill = writeField(load(sampleSkill), field('description'), '');
    const { fieldIssues, valid, issues } = analyzeSkill(skill, 'codex');

    expect(valid).toBe(false);
    expect(fieldIssues.description).toEqual([
      { severity: 'error', message: 'Codex requires this field.' },
    ]);
    expect(issues[0]?.severity).toBe('error');
  });

  it('checks agents/openai.yaml for Codex', () => {
    const skill = writeField(load(sampleSkill), field('policy.products'), ['codex', 'desktop']);
    const { fieldIssues, issues } = analyzeSkill(skill, 'codex');

    expect(fieldIssues['policy.products']?.[0]?.message).toMatch(/^`\[1\]`: /);
    expect(issues.at(-1)?.message).toMatch(/^`agents\/openai\.yaml`: `policy\.products\[1\]`: /);
  });

  it('checks the name against the folder it’s in', () => {
    const skill = load(sampleSkill, { directoryName: 'notes' });
    const { issues } = analyzeSkill(skill, 'claude');

    expect(issues).toEqual([
      { severity: 'error', message: 'Name `release-notes` must match its directory name `notes`' },
    ]);
  });
});

describe('tool lists', () => {
  it('keeps a comma string a comma string, even from one item', () => {
    const skill = load('---\nname: a\ndescription: Does a.\ndisallowed-tools: Write\n---\n');
    const edited = writeField(skill, field('disallowed-tools'), ['Write', 'WebFetch']);

    expect(skillText(edited, 'claude')).toContain('disallowed-tools: Write, WebFetch\n');
  });

  it('keeps a space-separated string space-separated', () => {
    const skill = load('---\nname: a\nallowed-tools: Read Bash(git log *)\n---\n');
    const edited = writeField(skill, field('allowed-tools'), ['Read', 'Bash(git log *)', 'Grep']);

    expect(skillText(edited, 'claude')).toContain('allowed-tools: Read Bash(git log *) Grep\n');
  });

  it('writes a new list as a YAML list and removes an emptied one', () => {
    const added = writeField(load(sampleSkill), field('disallowed-tools'), ['Write']);
    expect(skillText(added, 'claude')).toContain('disallowed-tools:\n  - Write\n');

    const emptied = writeField(added, field('allowed-tools'), []);
    expect(skillText(emptied, 'claude')).not.toMatch(/^allowed-tools/m);
  });
});

describe('tool dependencies', () => {
  it('adds, fills, and removes rows, writing agents/openai.yaml', () => {
    let skill = addDependency(load(sampleSkill));
    expect(exportSkill(skill, 'codex')).toHaveLength(1);

    skill = setDependency(skill, 0, 'type', 'mcp');
    skill = setDependency(skill, 0, 'value', 'docs');
    skill = setDependency(skill, 0, 'url', 'https://example.com/mcp');
    expect(exportSkill(skill, 'codex')[1]?.text).toBe(
      'dependencies:\n  tools:\n    - type: mcp\n      value: docs\n      url: https://example.com/mcp\n',
    );
    expect(analyzeSkill(skill, 'codex').valid).toBe(true);

    skill = setDependency(skill, 0, 'url', '');
    expect(exportSkill(skill, 'codex')[1]?.text).not.toContain('url');

    skill = removeDependency(skill, 0);
    expect(skill.openai).toEqual({});
    expect(exportSkill(skill, 'codex')).toHaveLength(1);
  });

  it('keeps keys the rows don’t edit, such as oauth', () => {
    const skill = load(handWritten, {
      openai:
        'dependencies:\n  tools:\n    - type: mcp\n      value: docs\n      oauth:\n        callbackPort: 8080\n',
    });
    const edited = setDependency(skill, 0, 'description', 'Docs');

    expect(exportSkill(edited, 'codex')[1]?.text).toContain('callbackPort: 8080');
    expect(exportSkill(edited, 'codex')[1]?.text).toContain('description: Docs');
  });

  it('says which key a row is missing', () => {
    const skill = setDependency(addDependency(load(sampleSkill)), 0, 'type', 'mcp');
    const { fieldIssues, valid } = analyzeSkill(skill, 'codex');

    expect(valid).toBe(false);
    expect(fieldIssues['dependencies.tools']).toEqual([
      { severity: 'error', message: 'Tool 1 needs a `value`.' },
    ]);
  });
});
