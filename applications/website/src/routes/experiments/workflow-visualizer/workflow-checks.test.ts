import { claudeWorkflowMaximumScriptBytes } from '@lostgradient/skillset/workflows';
import { describe, expect, it } from 'vitest';

import sample from './sample.workflow.js?raw';
import { checkWorkflow } from './workflow-checks';
import { maximumScriptBytes } from './workflow-model';

const meta = (phases = ''): string =>
  `export const meta = { name: 'test', description: 'A made-up workflow for a test'${phases} };\n`;

const messages = (source: string, severity?: 'error' | 'warning'): string[] =>
  checkWorkflow(source)
    .filter((check) => severity === undefined || check.severity === severity)
    .map((check) => check.message);

describe('checkWorkflow', () => {
  it('passes the sample', () => {
    expect(checkWorkflow(sample)).toEqual([]);
  });

  it('keeps the page’s size limit in step with Claude Code’s', () => {
    expect(maximumScriptBytes).toBe(claudeWorkflowMaximumScriptBytes);
  });

  it('reports a script that doesn’t parse as one error with its line', () => {
    const checks = checkWorkflow(`${meta()}const answer = ;\n`);

    expect(checks).toEqual([
      {
        severity: 'error',
        message: 'The script doesn’t parse at line 2: Unexpected token.',
        line: 2,
      },
    ]);
  });

  it('reports a meta block that isn’t first', () => {
    const [check] = checkWorkflow(`await agent('Go');\n${meta()}`);

    expect(check?.severity).toBe('error');
    expect(check?.message).toContain('Claude Code won’t list this workflow');
    expect(check?.message).toContain('FIRST statement');
  });

  it('names the meta key that fails', () => {
    const errors = messages(`export const meta = { name: 'test', description: '' };\n`, 'error');

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('`meta.description`:');
  });

  it('flags each call Claude Code makes throw', () => {
    const errors = messages(
      `${meta()}const a = Date.now();\nconst b = Math.random();\nconst c = new Date();\nconst d = await import('fs');\n`,
      'error',
    );

    expect(errors).toEqual([
      expect.stringMatching(/^Line 2: `Date\.now\(\)` throws/),
      expect.stringMatching(/^Line 3: `Math\.random\(\)` throws/),
      expect.stringMatching(/^Line 4: `new Date\(\)` with no arguments throws/),
      expect.stringMatching(/^Line 5: `import\(\)` stops the script/),
    ]);
  });

  it('allows a date built from a value', () => {
    expect(checkWorkflow(`${meta()}const when = new Date(args.timestamp);\n`)).toEqual([]);
  });

  it('flags agent options Claude Code won’t accept', () => {
    const checks = checkWorkflow(
      `${meta()}await agent('Go', { effort: 'extreme', isolation: 'remote', stallMs: 'soon' });\n`,
    );

    expect(checks.map(({ severity, message }) => ({ severity, message }))).toEqual([
      {
        severity: 'error',
        message:
          "`agent()` on line 2: `effort` must be `low`, `medium`, `high`, `xhigh`, or `max`, not `'extreme'`.",
      },
      { severity: 'error', message: '`agent()` on line 2: `isolation` can only be `worktree`.' },
      { severity: 'error', message: expect.stringContaining('`stallMs`:') },
    ]);
  });

  it('flags an output schema that isn’t an object with properties', () => {
    const errors = messages(
      `${meta()}await agent('Go', { schema: { type: 'string' } });\n`,
      'error',
    );

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((message) => message.includes('the output schema'))).toBe(true);
  });

  it('flags a required key that additionalProperties: false rules out', () => {
    const errors = messages(
      `${meta()}await agent('Go', { schema: { type: 'object', properties: {}, required: ['answer'], additionalProperties: false } });\n`,
      'error',
    );

    expect(errors).toEqual([expect.stringContaining('required key "answer" is not in properties')]);
  });

  it('warns about an option name agent() doesn’t read', () => {
    expect(messages(`${meta()}await agent('Go', { modle: 'haiku' });\n`, 'warning')).toEqual([
      '`agent()` on line 2: `modle` isn’t an `agent()` option, so it’s ignored.',
    ]);
  });

  it('warns about phase titles that don’t match meta.phases, in either direction', () => {
    const warnings = messages(
      `${meta(", phases: [{ title: 'Review' }, { title: 'Report' }]")}phase('Reveiw');\nawait agent('Go', { phase: 'Report' });\n`,
      'warning',
    );

    expect(warnings).toEqual([
      expect.stringContaining("`phase('Reveiw')` on line 2 matches no `meta.phases` title"),
      '`meta.phases` lists `Review`, but no `phase()` call or `phase` option uses it.',
    ]);
  });

  it('doesn’t compare phases when meta lists none', () => {
    expect(checkWorkflow(`${meta()}phase('Anything');\nawait agent('Go');\n`)).toEqual([]);
  });

  describe('a fan-out’s results through .filter(Boolean)', () => {
    it('flags it through a variable', () => {
      const warnings = messages(
        `${meta()}const results = await parallel(args.files.map((file) => () => agent(file)));\nconst kept = results.filter(Boolean);\n`,
        'warning',
      );

      expect(warnings).toEqual([
        expect.stringContaining('`.filter(Boolean)` on line 3 drops the `null`'),
      ]);
      expect(warnings[0]).toContain('`results.filter((item) => item === null).length`');
    });

    it('flags it inline, after .flat(), and with an identity callback', () => {
      const warnings = messages(
        `${meta()}const a = (await parallel([() => agent('x')])).filter(Boolean);\nconst reviews = await pipeline(args.files, (file) => agent(file));\nconst b = reviews.flat().filter(Boolean);\nconst c = reviews.filter((review) => review);\n`,
        'warning',
      );

      expect(warnings).toHaveLength(3);
      expect(warnings.map((warning) => warning.match(/on line (\d+)/)?.[1])).toEqual([
        '2',
        '4',
        '5',
      ]);
    });

    it('leaves other filters alone', () => {
      expect(
        checkWorkflow(
          `${meta()}const reviews = await pipeline(args.files, (file) => agent(file));\nconst failed = reviews.filter((review) => review === null).length;\nconst names = args.files.filter(Boolean);\n`,
        ),
      ).toEqual([]);
    });
  });

  it('lists errors before warnings, each in line order', () => {
    const checks = checkWorkflow(
      `${meta()}await agent('Go', { modle: 'x' });\nconst a = Date.now();\nawait agent('Go', { effort: 'lots' });\n`,
    );

    expect(checks.map(({ severity, line }) => `${severity}:${line}`)).toEqual([
      'error:3',
      'error:4',
      'warning:2',
    ]);
  });
});
