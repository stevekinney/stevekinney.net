import { describe, expect, it } from 'vitest';

import { lintScript, maskSource } from './lint-script';

/** A script that passes every check. */
const clean = `export const meta = {
  name: 'flaky-fixes',
  description: 'Find flaky tests and propose fixes',
  phases: [{ title: 'Scan', detail: 'grep test logs' }, { title: 'Fix' }],
};

phase('Scan');
const flaky = await agent('Find flaky tests', { model: 'haiku', schema: FLAKY });
phase('Fix');
const fixes = await pipeline(flaky.tests, (test) =>
  agent(\`Fix \${test.name}\`, { model: 'sonnet', schema: FIX }),
);
return fixes;
`;

const rules = (source: string) => lintScript(source).map((finding) => [finding.rule, finding.line]);

describe('acceptance check 7: the linter', () => {
  const script = `export const meta = {
  name: 'flaky-fixes',
  description: 'Find flaky tests and propose fixes',
  phases: [{ title: 'Scan', detail: 'grep test logs' }],
};

phase('Scan');
const flaky = await agent('Find flaky tests', { model: 'haiku', schema: FLAKY });
const pick = flaky.tests[Math.floor(Math.random() * flaky.tests.length)];
phase('Fix');
return agent(\`Fix \${pick.name}\`, { model: 'sonnet' });
`;

  it("finds exactly Math.random() on line 9 and phase('Fix') on line 10", () => {
    const findings = lintScript(script);

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => [finding.rule, finding.line])).toEqual([
      ['banned-call', 9],
      ['phase-not-in-meta', 10],
    ]);
    expect(findings[0].message).toContain('Math.random()');
    expect(findings[1].message).toContain("phase('Fix')");
  });
});

describe('lintScript', () => {
  it('finds nothing in a clean script', () => {
    expect(lintScript(clean)).toEqual([]);
  });

  it('asks about .filter(Boolean)', () => {
    const findings = lintScript(`${clean}const kept = fixes.filter(Boolean);\n`);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: 'filter-boolean',
      line: 14,
      question: true,
      concept: 'nulls',
    });
  });

  it('says an agent() call without a model inherits the session model', () => {
    const findings = lintScript(
      clean.replace("{ model: 'haiku', schema: FLAKY }", '{ schema: FLAKY }'),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rule: 'agent-without-model', line: 8, concept: 'models' });
    expect(findings[0].message).toContain('these inherit your session model');
  });

  it('asks whether a parallel() stage could be a pipeline()', () => {
    const findings = lintScript(
      `${clean}const checks = await parallel(fixes.map((fix) => () => agent('Check', { model: 'haiku' })));\n`,
    );

    expect(findings).toEqual([
      expect.objectContaining({ rule: 'parallel-call', line: 14, question: true }),
    ]);
  });

  it('reports Date.now(), new Date(), and import(), but not new Date with an argument', () => {
    const findings = lintScript(
      `${clean}const a = Date.now();\nconst b = new Date();\nconst c = new Date(0);\nconst d = await import('fs');\n`,
    );

    expect(findings.map((finding) => [finding.rule, finding.line])).toEqual([
      ['banned-call', 14],
      ['banned-call', 15],
      ['banned-call', 17],
    ]);
  });

  it('ignores banned calls and phase titles inside strings and comments', () => {
    const findings = lintScript(
      `${clean}// Math.random() would break resume\nlog('Date.now() and phase("Nope") are fine in a string');\n/* new Date() */\n`,
    );

    expect(findings).toEqual([]);
  });

  it('reports type annotations', () => {
    const findings = lintScript(
      `${clean}const count: number = 3;\ninterface Fix { name: string }\ntype Row = { id: string };\nconst f = (item: Item) => item;\nconst g = (item) => item as Fix;\nfunction h(value: string): string { return value; }\n`,
    );

    expect(findings.map((finding) => [finding.rule, finding.line])).toEqual([
      ['type-annotation', 14],
      ['type-annotation', 15],
      ['type-annotation', 16],
      ['type-annotation', 17],
      ['type-annotation', 18],
      ['type-annotation', 19],
    ]);
  });

  it('doesn’t mistake object literals, destructuring, or renamed imports for annotations', () => {
    const findings = lintScript(
      `${clean}const { name: renamed } = fixes;\nconst h = ({ a: b, c: d }) => b;\nconst o = { key: Value, other: 'x' };\n`,
    );

    expect(findings).toEqual([]);
  });

  it('reports variables, calls, spreads, and interpolation inside meta', () => {
    const script = `const NAME = 'x';
export const meta = {
  name: NAME,
  description: describe(),
  ...defaults,
  phases: [{ title: \`Scan \${NAME}\` }],
};
`;
    const findings = lintScript(script);

    expect(findings.map((finding) => [finding.rule, finding.line])).toEqual([
      ['meta-not-literal', 3],
      ['meta-not-literal', 4],
      ['meta-not-literal', 5],
      ['meta-not-literal', 6],
    ]);
    expect(findings[0].message).toContain('variable NAME');
    expect(findings[1].message).toContain('call describe()');
    expect(findings[2].message).toContain('spreads');
    expect(findings[3].message).toContain('interpolation');
  });

  it('reports a missing name or description in meta', () => {
    const findings = lintScript("export const meta = { name: 'x' };\n");

    expect(findings).toEqual([
      expect.objectContaining({
        rule: 'meta-missing-field',
        line: 1,
        message: expect.stringContaining('no description'),
      }),
    ]);
  });

  it('accepts quoted meta keys and bare string phases', () => {
    const findings = lintScript(
      `export const meta = { 'name': 'x', "description": 'y', phases: ['Scan'] };\nphase('Scan');\n`,
    );

    expect(findings).toEqual([]);
  });

  it('reports a script with no meta, and every phase() in it', () => {
    expect(rules("phase('Scan');\n")).toEqual([
      ['meta-missing', 1],
      ['phase-not-in-meta', 1],
    ]);
  });

  it('labels every finding with its line number, counting from 1', () => {
    expect(
      rules('\n\nMath.random();\nexport const meta = { name: "a", description: "b" };'),
    ).toEqual([['banned-call', 3]]);
  });
});

describe('maskSource', () => {
  it('blanks comments and string contents but keeps offsets, quotes, and interpolations', () => {
    const source = "a('x // y'); // c\nb(`t ${v} u`);";
    const masked = maskSource(source);

    expect(masked).toHaveLength(source.length);
    expect(masked).toBe("a('      ');     \nb(`  ${v}  `);");
  });

  it('handles nested template literals and escaped quotes', () => {
    const source = "f(`a ${g(`b ${c}`)} d`, 'it\\'s');";

    expect(maskSource(source)).toBe("f(`  ${g(`  ${c}`)}  `, '     ');");
  });
});
