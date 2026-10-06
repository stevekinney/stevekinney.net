import { parse } from 'acorn';
import { describe, expect, it } from 'vitest';

import { defaultCodexExportOptions, noteSegments } from './codex-export-options';
import type { CodexExportOptions, CompatibilityNote } from './codex-export-options';
import { generateCodexWorkflow, listClaudeModels } from './codex-export';
import runtimeSource from './codex-runtime.js?raw';
import sample from './sample.workflow.js?raw';

const generate = (source: string, options: Partial<CodexExportOptions> = {}) => {
  const result = generateCodexWorkflow(source, { ...defaultCodexExportOptions, ...options });
  if (!result.ok) throw new Error(result.error);
  return result;
};

const notesAbout = (notes: readonly CompatibilityNote[], feature: string) =>
  notes.filter((note) => note.feature === feature);

const script = (body: string, meta = "{ name: 'tiny', description: 'A tiny workflow' }") =>
  `export const meta = ${meta};\n\n${body}\n`;

describe('generateCodexWorkflow', () => {
  it('names the file after meta.name', () => {
    expect(generate(sample).fileName).toBe('review-changed-files.codex.mjs');
    expect(generate(script('return 1;', "{ name: 'my flow/v2', description: 'x' }")).fileName).toBe(
      'my-flow-v2.codex.mjs',
    );
  });

  it('lays out header, imports, CONFIG, runtime, meta, body, and entry in order', () => {
    const { text } = generate(sample);
    const order = [
      '// review-changed-files.codex.mjs',
      'npm install @openai/codex-sdk ajv',
      "import { Codex } from '@openai/codex-sdk';",
      "import Ajv from 'ajv';",
      'const CONFIG = {',
      runtimeSource.trim(),
      'const { agent, parallel, pipeline, phase, log, workflow, budget } = createWorkflowRuntime(',
      "export const meta = {\n  name: 'review-changed-files',",
      'async function workflowBody(args) {\nconst FILES = {',
      'return { reviewed: changed.files.length, failed, findings: confirmed, summary };\n}',
      'const result = await workflowBody(workflowArgs);',
    ];
    const positions = order.map((fragment) => text.indexOf(fragment));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('produces a module that parses', () => {
    expect(() =>
      parse(generate(sample).text, { ecmaVersion: 'latest', sourceType: 'module' }),
    ).not.toThrow();
  });

  it('writes one CONFIG.models entry per Claude model, plus inherit', () => {
    const { text } = generate(sample, {
      models: { opus: 'gpt-large', haiku: '  ', inherit: 'gpt-x' },
    });

    expect(text).toContain(
      "  models: {\n    inherit: 'gpt-x',\n    haiku: null,\n    sonnet: null,\n    opus: 'gpt-large',\n  },",
    );
  });

  it('escapes a model id so the file still parses', () => {
    const { text } = generate(script("await agent('Hi', { model: 'claude-x' });"), {
      models: { 'claude-x': "it's\nodd" },
    });

    expect(text).toContain("    'claude-x': 'it\\'s\\nodd',");
    expect(() => parse(text, { ecmaVersion: 'latest', sourceType: 'module' })).not.toThrow();
  });

  it('writes the sandbox and network settings into CONFIG', () => {
    const { text } = generate(sample, { sandboxMode: 'read-only', networkAccessEnabled: true });

    expect(text).toContain("  sandboxMode: 'read-only',");
    expect(text).toContain('  networkAccessEnabled: true,');
    expect(text).toContain("  approvalPolicy: 'never',");
  });

  it('keeps a description with newlines and comment markers inside the header comment', () => {
    const { text } = generate(
      script('return 1;', "{ name: 'x', description: 'Line one\\nLine two */ still a comment' }"),
    );
    const headerLines = text.slice(0, text.indexOf('import ')).trimEnd().split('\n');

    expect(headerLines.every((line) => line.startsWith('//'))).toBe(true);
    expect(text).toContain('Line one Line two */ still a comment');
  });

  it('fails with the reason when meta is invalid', () => {
    const result = generateCodexWorkflow("const x = 1;\nexport const meta = { name: 'x' };", {
      ...defaultCodexExportOptions,
    });

    expect(result).toEqual({ ok: false, error: expect.stringContaining('FIRST statement') });
  });

  it('fails, naming the line, when the body cannot run inside a function', () => {
    const result = generateCodexWorkflow(
      script("const x = 1;\nimport fs from 'node:fs';\nreturn x;"),
      defaultCodexExportOptions,
    );

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/can’t run inside a function \(line 4\)/),
    });
  });
});

/** The sample's line holding `text`, so a line added above one doesn't break these tests. */
const sampleLine = (text: string): number =>
  sample.split('\n').findIndex((line) => line.includes(text)) + 1;

const sampleLines = {
  listFiles: sampleLine('const changed = await agent('),
  args: sampleLine('args?.base'),
  review: sampleLine('agent(`Review ${file}'),
  verify: sampleLine('agent(`Try to disprove'),
  summary: sampleLine('const summary = await agent('),
};

describe('compatibility notes for the sample', () => {
  const { notes } = generate(sample, { models: { sonnet: 'gpt-mid' } });

  it('maps each model and the agents with none', () => {
    expect(notesAbout(notes, 'Models')).toEqual([
      {
        severity: 'info',
        feature: 'Models',
        message: "1 `agent()` call with `model: 'haiku'` runs on Codex’s default model.",
        line: sampleLines.listFiles,
      },
      {
        severity: 'info',
        feature: 'Models',
        message: "1 `agent()` call with `model: 'sonnet'` runs on `gpt-mid`.",
        line: sampleLines.verify,
      },
      {
        severity: 'info',
        feature: 'Models',
        message: "1 `agent()` call with `model: 'opus'` runs on Codex’s default model.",
        line: sampleLines.summary,
      },
      {
        severity: 'info',
        feature: 'Models',
        message:
          '1 `agent()` call with no `model` runs on Codex’s default model, where Claude Code would use the session’s model.',
        line: sampleLines.review,
      },
    ]);
  });

  it('explains the effort mapping and the schema conversions', () => {
    expect(notesAbout(notes, 'Effort')).toEqual([
      expect.objectContaining({
        line: sampleLines.review,
        message: expect.stringContaining('(`high`)'),
      }),
    ]);
    expect(notesAbout(notes, 'Structured output')).toEqual([
      expect.objectContaining({
        severity: 'info',
        line: sampleLines.listFiles,
        message: expect.stringContaining('optional `base` is sent as nullable'),
      }),
      expect.objectContaining({
        severity: 'info',
        line: sampleLines.review,
        message: expect.stringContaining('optional `findings[].suggestion` is sent as nullable'),
      }),
    ]);
  });

  it('covers args, concurrency, the sandbox, and agent setup, with no warnings', () => {
    expect(notesAbout(notes, 'Arguments')).toEqual([
      expect.objectContaining({ line: sampleLines.args }),
    ]);
    expect(notes.map((note) => note.feature)).toEqual(
      expect.arrayContaining(['Concurrency', 'Sandbox', 'Agents', 'Resuming']),
    );
    expect(notes.filter((note) => note.severity === 'warning')).toEqual([]);
    expect(notesAbout(notes, 'Budget')).toEqual([]);
    // Only `label` is computed in the sample, which changes nothing in the export.
    expect(notesAbout(notes, 'Options computed at run time')).toEqual([]);
  });

  it('keeps literals inside backticks', () => {
    for (const note of notes) expect(note.message.split('`').length % 2).toBe(1);
    expect(noteSegments('Use `a` and `b`.')).toEqual([
      { text: 'Use ', code: false },
      { text: 'a', code: true },
      { text: ' and ', code: false },
      { text: 'b', code: true },
      { text: '.', code: false },
    ]);
  });
});

describe('compatibility notes for unusual scripts', () => {
  const source = script(
    [
      "const SHAPE = { type: 'object', properties: { name: { type: 'string', minLength: 2 }, value: { oneOf: [{ type: 'string' }, { type: 'number' }] } }, required: ['name', 'value'] };",
      "await agent('Edit', { isolation: 'worktree', agentType: 'editor', stallMs: 5 });",
      "await agent('Shape', { schema: SHAPE, disallowedTools: ['Bash'], bashCommandClamp: ['Bash(ls)'] });",
      "await workflow('triage');",
      'const name = String(budget.remaining());',
      'await workflow(name);',
      "await agent('Dynamic', { model: name });",
    ].join('\n'),
    "{ name: 'odd', description: 'Odd', phases: [{ title: 'One', model: 'opus' }] }",
  );
  const { notes, text } = generate(source);

  it('warns about worktrees, ignored options, and nested workflows at their lines', () => {
    expect(notesAbout(notes, 'Worktrees')).toEqual([
      expect.objectContaining({ severity: 'warning', line: 4 }),
    ]);
    expect(
      notesAbout(notes, 'Unsupported options').map((note) => [note.line, note.message]),
    ).toEqual([
      [4, expect.stringMatching(/^`agentType` is ignored/)],
      [5, expect.stringMatching(/^`disallowedTools` is ignored/)],
      [5, expect.stringMatching(/^`bashCommandClamp` is ignored/)],
      [4, expect.stringMatching(/^`stallMs` is ignored/)],
    ]);
    expect(notesAbout(notes, 'Nested workflows')).toEqual([
      expect.objectContaining({
        line: 6,
        message: expect.stringContaining("`workflow('triage')` throws"),
      }),
      expect.objectContaining({ message: expect.stringContaining('with a computed name throws') }),
    ]);
  });

  it('reports dropped keywords and oneOf rewrites in the schema', () => {
    const schemaNotes = notesAbout(notes, 'Structured output');

    expect(schemaNotes).toEqual([
      expect.objectContaining({
        severity: 'warning',
        line: 5,
        message: expect.stringContaining('can’t take `minLength` at `name`'),
      }),
      expect.objectContaining({
        severity: 'warning',
        line: 5,
        message: expect.stringContaining('at `value`, `oneOf` became `anyOf`'),
      }),
    ]);
  });

  it('notes the budget, phase models, and options computed at run time', () => {
    expect(notesAbout(notes, 'Budget')).toEqual([expect.objectContaining({ line: 7 })]);
    expect(notesAbout(notes, 'Phases')).toHaveLength(1);
    expect(notesAbout(notes, 'Options computed at run time')).toEqual([
      expect.objectContaining({
        line: 9,
        message: expect.stringMatching(/^1 `agent\(\)` call has `model` the converter/),
      }),
    ]);
    expect(notesAbout(notes, 'Arguments')).toEqual([]);
  });

  it('lists the differences in the header, but not the model mapping', () => {
    const header = text.slice(0, text.indexOf('import '));

    expect(header).toContain('// - `agentType` is ignored');
    expect(header).not.toContain('runs on Codex’s default model');
  });

  it('warns when the sandbox is read-only or off', () => {
    const readOnly = generate(source, { sandboxMode: 'read-only' }).notes;
    const fullAccess = generate(source, { sandboxMode: 'danger-full-access' }).notes;

    expect(notesAbout(readOnly, 'Sandbox')).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringContaining("'read-only'"),
      }),
    ]);
    expect(notesAbout(fullAccess, 'Sandbox')).toEqual([
      expect.objectContaining({
        severity: 'warning',
        message: expect.stringContaining('no sandbox'),
      }),
    ]);
  });
});

describe('listClaudeModels', () => {
  it('lists model names in order of first use and counts agents with none', () => {
    expect(listClaudeModels(sample)).toEqual({
      ok: true,
      models: [
        { name: 'haiku', calls: 1, line: sampleLines.listFiles },
        { name: 'sonnet', calls: 1, line: sampleLines.verify },
        { name: 'opus', calls: 1, line: sampleLines.summary },
      ],
      inherited: { calls: 1, line: sampleLines.review },
    });
  });

  it('reports a script that does not parse', () => {
    expect(listClaudeModels('export const meta = {')).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });
});
