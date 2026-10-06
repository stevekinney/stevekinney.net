import {
  claudeSkillFrontmatterSchema,
  codexSkillFrontmatterSchema,
  openaiConfigurationSchema,
} from '@lostgradient/skillset';
import { describe, expect, it } from 'vitest';

import type { SourceFile } from '$lib/experiments/dropped-files';

import { checkFields } from './skill-checks';
import { blankDocument, claudeOnlyKeys, pickSkillFiles, specKeys } from './skill-document';
import type { SkillDocument } from './skill-document';
import {
  fields,
  groupOrder,
  omitted,
  readBoolean,
  readList,
  setIn,
  splitList,
  writeField,
} from './skill-fields';

const fieldKeys = new Set(fields.map((field) => field.key));
const covered = (key: string): boolean => fieldKeys.has(key) || key in omitted;

const claudeKeys = Object.keys(claudeSkillFrontmatterSchema.shape);
const codexKeys = Object.keys(codexSkillFrontmatterSchema.shape);
const openaiKeys = Object.entries(openaiConfigurationSchema.shape).flatMap(([section, schema]) =>
  Object.keys(schema.unwrap().shape).map((key) => `${section}.${key}`),
);

describe('field coverage', () => {
  it.each(claudeKeys)('Claude Code’s %s has a field or a reason it has none', (key) => {
    expect(covered(key)).toBe(true);
  });

  it.each(codexKeys)('Codex’s %s has a field or a reason it has none', (key) => {
    expect(covered(key)).toBe(true);
  });

  it.each(openaiKeys)('agents/openai.yaml’s %s has a field or a reason it has none', (key) => {
    expect(covered(key)).toBe(true);
  });

  it('has no field for a key the schemas don’t know', () => {
    const known = new Set([...claudeKeys, ...openaiKeys, 'metadata.short-description']);

    expect(fields.map((field) => field.key).filter((key) => !known.has(key))).toEqual([]);
  });

  it('splits the keys between the targets the way the schemas do', () => {
    expect([...claudeOnlyKeys].sort()).toEqual(
      claudeKeys.filter((key) => !codexKeys.includes(key)).sort(),
    );
    expect(specKeys.every((key) => codexKeys.includes(key))).toBe(true);
  });

  it('shows every field for the target that writes it', () => {
    for (const field of fields) {
      const writtenFor =
        field.file === 'openai'
          ? ['codex']
          : claudeOnlyKeys.includes(field.key)
            ? ['claude']
            : ['claude', 'codex'];
      for (const target of writtenFor as ('claude' | 'codex')[]) {
        expect(groupOrder[target]).toContain(field.groups[target]);
      }
    }
  });
});

describe('reading values', () => {
  it('splits a tool list on commas and spaces, but not inside parentheses', () => {
    expect(splitList('Read, Bash(git diff:*) Grep', 'tools')).toEqual([
      'Read',
      'Bash(git diff:*)',
      'Grep',
    ]);
    expect(splitList('src/**/*.ts, test/**', 'commas')).toEqual(['src/**/*.ts', 'test/**']);
    expect(readList(['a', 'b'])).toEqual(['a', 'b']);
    expect(readList(undefined)).toEqual([]);
  });

  it('reads Claude Code’s boolean spellings', () => {
    expect(readBoolean('yes')).toBe('true');
    expect(readBoolean('Off')).toBe('false');
    expect(readBoolean(1)).toBe('true');
    expect(readBoolean(undefined)).toBe('');
    expect(readBoolean('maybe')).toBe('maybe');
  });

  it('sets nested values and removes a mapping it empties', () => {
    expect(setIn({ a: 1, metadata: { x: '1' } }, ['metadata', 'x'], '')).toEqual({ a: 1 });
    expect(setIn({ a: 1, b: 2 }, ['a'], 3)).toEqual({ a: 3, b: 2 });
    expect(Object.keys(setIn({ a: 1, b: 2 }, ['a'], 3))).toEqual(['a', 'b']);
  });

  it('leaves an untouched yes alone and writes a real boolean on change', () => {
    const field = fields.find((candidate) => candidate.key === 'background');
    if (!field) throw new Error('No background field');
    const skill: SkillDocument = { ...blankDocument(), frontmatter: { background: 'yes' } };

    expect(writeField(skill, field, 'true').frontmatter.background).toBe('yes');
    expect(writeField(skill, field, 'false').frontmatter.background).toBe(false);
    expect(writeField(skill, field, '').frontmatter).toEqual({});
  });
});

describe('picking files from a drop', () => {
  const file = (path: string): SourceFile => ({ file: new File([''], path), path });

  it('finds SKILL.md, the openai.yaml beside it, and the folder name', () => {
    const files = [
      file('pdf-forms/SKILL.md'),
      file('pdf-forms/agents/openai.yaml'),
      file('pdf-forms/scripts/fill.py'),
      file('pdf-forms/references/fields.md'),
    ];

    expect(pickSkillFiles(files)).toEqual({
      skill: files[0],
      openai: files[1],
      directoryName: 'pdf-forms',
      otherFiles: 2,
      otherSkills: 0,
    });
  });

  it('takes the shallowest skill from a folder of several', () => {
    const picked = pickSkillFiles([
      file('skills/b/SKILL.md'),
      file('skills/a/nested/SKILL.md'),
      file('skills/a/SKILL.md'),
    ]);

    expect(picked.skill?.path).toBe('skills/b/SKILL.md');
    expect(picked.otherSkills).toBe(2);
  });

  it('accepts a lone Markdown file or a lone openai.yaml', () => {
    expect(pickSkillFiles([file('release-notes.md')]).skill?.path).toBe('release-notes.md');
    expect(pickSkillFiles([file('release-notes.md')]).directoryName).toBeNull();
    expect(pickSkillFiles([file('openai.yaml')]).openai?.path).toBe('openai.yaml');
    expect(pickSkillFiles([file('notes.txt')]).skill).toBeNull();
  });
});

describe('field checks', () => {
  const skill = (frontmatter: Record<string, unknown>, body = 'Do the thing.'): SkillDocument => ({
    ...blankDocument(),
    frontmatter,
    body,
  });

  it('passes a well-written skill', () => {
    expect(
      checkFields(
        skill({
          name: 'format-sql',
          description: 'Formats SQL queries. Use when asked to tidy or format a query.',
        }),
        'claude',
      ),
    ).toEqual({});
  });

  it('flags a bad, vague, or mismatched name', () => {
    expect(checkFields(skill({ name: 'Format_SQL' }), 'claude').name?.[0]?.severity).toBe('error');
    expect(checkFields(skill({ name: 'helper' }), 'claude').name?.[0]?.severity).toBe('warning');
    expect(
      checkFields({ ...skill({ name: 'a' }), directoryName: 'b' }, 'claude').name?.[0]?.message,
    ).toBe('It has to match the folder name, `b`.');
  });

  it('flags a first-person description and suggests saying when to use it', () => {
    const issues = checkFields(skill({ description: 'I format SQL.' }), 'claude').description;

    expect(issues?.map((issue) => issue.severity)).toEqual(['warning', 'tip']);
  });

  it('flags conflicting invocation settings and an agent without a fork', () => {
    const issues = checkFields(
      skill({
        'disable-model-invocation': true,
        'user-invocable': 'no',
        agent: 'Explore',
      }),
      'claude',
    );

    expect(issues['disable-model-invocation']?.[0]?.severity).toBe('warning');
    expect(issues['user-invocable']?.[0]?.severity).toBe('warning');
    expect(issues.agent?.[0]?.message).toMatch(/context: fork/);
  });

  it('flags a tool both pre-approved and removed, and arguments the body never uses', () => {
    const issues = checkFields(
      skill(
        {
          'allowed-tools': 'Read Bash(git log *)',
          'disallowed-tools': ['Bash'],
          arguments: ['version'],
        },
        'No placeholders here.',
      ),
      'claude',
    );

    expect(issues['allowed-tools']?.[0]?.message).toMatch(/^`Bash` is also removed/);
    expect(issues.arguments?.[0]?.severity).toBe('warning');
    expect(issues['argument-hint']?.[0]?.severity).toBe('tip');
  });

  it('skips Claude Code’s rules for Codex', () => {
    const issues = checkFields(skill({ agent: 'Explore', name: 'claude-helper' }), 'codex');

    expect(issues.agent).toBeUndefined();
    expect(issues.name).toBeUndefined();
  });
});
