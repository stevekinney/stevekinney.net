import { describe, expect, it } from 'vitest';

import { analyzeWorkflow } from './analyze-workflow';
import sample from './sample.workflow.js?raw';
import { textParts } from './workflow-model';
import type {
  AgentStep,
  BranchStep,
  CodeStep,
  FanOutStep,
  HelperStep,
  LoopStep,
  ParallelStep,
  PhaseStep,
  PipelineStep,
  Step,
  WorkflowDiagram,
} from './workflow-model';

const meta = `export const meta = { name: 'test', description: 'A made-up workflow for a test' };\n`;

const analyze = (body: string, header = meta): WorkflowDiagram => {
  const result = analyzeWorkflow(`${header}${body}`);
  if (!result.ok) throw new Error(`Expected the script to parse: ${result.error.message}`);

  return result;
};

/** Narrows a step to the kind a test expects, failing clearly when it's something else. */
function expectKind<Kind extends Step['kind']>(
  step: Step | undefined,
  kind: Kind,
): Extract<Step, { kind: Kind }> {
  expect(step?.kind).toBe(kind);

  return step as Extract<Step, { kind: Kind }>;
}

const kinds = (steps: readonly Step[]): string[] => steps.map((step) => step.kind);

/** The 1-based line of the sample that starts with `text`, so a line added above `meta` doesn't break these tests. */
const sampleLine = (text: string): number =>
  sample.split('\n').findIndex((line) => line.startsWith(text)) + 1;

describe('the sample workflow', () => {
  const diagram = analyze(sample, '');

  it('reads the header from meta', () => {
    expect(diagram.header).toEqual({
      name: 'review-changed-files',
      title: null,
      description: expect.stringContaining('Review each changed file'),
      whenToUse: expect.stringContaining('Before opening a pull request'),
    });
  });

  it('folds the schema constants into one code row, then splits the rest by phase', () => {
    expect(kinds(diagram.steps)).toEqual(['code', 'phase', 'phase', 'phase']);

    const constants = expectKind(diagram.steps[0], 'code');
    expect(constants.muted).toBe(true);
    expect(constants.statements).toEqual([
      'const FILES = {…}',
      'const FINDINGS = {…}',
      'const VERDICT = {…}',
    ]);

    const phases = diagram.steps.slice(1).map((step) => expectKind(step, 'phase'));
    expect(phases.map(({ title, detail }) => ({ title, detail }))).toEqual([
      { title: 'Collect', detail: 'Find the files that changed' },
      { title: 'Review', detail: 'One reviewer per file, then a skeptic per finding' },
      { title: 'Summarize', detail: 'Rank and merge what survived' },
    ]);
  });

  it('shows the first agent with its options, schema, line, and result', () => {
    const collect = expectKind(diagram.steps[1], 'phase');
    const list = expectKind(collect.steps[0], 'agent');

    expect(list).toMatchObject({
      title: 'List changed files',
      hasLabel: true,
      line: sampleLine('const changed = await agent('),
      result: 'changed',
      model: { text: 'haiku', dynamic: false },
      effort: null,
      unreadOptions: false,
      schema: {
        readable: true,
        properties: [
          { name: 'files', required: true },
          { name: 'base', required: false },
        ],
      },
    });
    expect(list.prompt).toContain('compared with ${args?.base ?? ');
  });

  it('draws the early exit as a branch with a log line and an output', () => {
    const collect = expectKind(diagram.steps[1], 'phase');
    const branch = expectKind(collect.steps[1], 'branch');
    const [arm] = branch.arms;

    expect(branch.arms).toHaveLength(1);
    expect(arm).toMatchObject({ kind: 'if', test: '!changed || changed.files.length === 0' });
    expect(kinds(arm?.steps ?? [])).toEqual(['log', 'return']);
    expect(expectKind(arm?.steps[1], 'return').expression).toBe(
      '{ reviewed: 0, failed: 0, findings: [] }',
    );
  });

  it('draws the review as a pipeline whose second stage fans out', () => {
    const review = expectKind(diagram.steps[2], 'phase');
    const pipeline = expectKind(review.steps[0], 'pipeline');

    expect(pipeline).toMatchObject({ over: 'changed.files', result: 'reviews' });
    expect(pipeline.stages.map((stage) => stage.parameters)).toEqual(['(file)', '(review, file)']);

    const reviewer = expectKind(pipeline.stages[0]?.steps[0], 'agent');
    expect(reviewer).toMatchObject({
      title: 'Review ${file}',
      effort: { text: 'high', dynamic: false },
      model: null,
      unreadOptions: false,
    });

    const fanOut = expectKind(pipeline.stages[1]?.steps[0], 'fan-out');
    expect(fanOut).toMatchObject({
      via: 'parallel',
      over: 'review?.findings ?? []',
      item: 'finding',
    });

    const [verifier, then] = fanOut.branch;
    expect(expectKind(verifier, 'agent')).toMatchObject({
      title: 'Verify ${file}:${finding.line}',
      model: { text: 'sonnet', dynamic: false },
    });
    expect(expectKind(then, 'code').statements[0]).toBe(
      '.then((verdict) => ({ file, ...finding, verdict }))',
    );
  });

  it('ends with the summary agent and the output', () => {
    const summarize = expectKind(diagram.steps[3], 'phase');

    expect(kinds(summarize.steps)).toEqual(['agent', 'return']);
    expect(expectKind(summarize.steps[0], 'agent')).toMatchObject({
      title: 'Write the summary',
      model: { text: 'opus', dynamic: false },
      schema: null,
      result: 'summary',
    });
  });

  it('counts call sites, fan-outs, phases, and models', () => {
    expect(diagram.summary).toEqual({
      agentCalls: 4,
      fanOuts: 2,
      phases: 3,
      models: ['haiku', 'sonnet', 'opus'],
      sessionModelAgents: 1,
      unreadOptions: 0,
    });
  });
});

describe('parse errors', () => {
  it('reports the message and line without the parser’s position suffix', () => {
    const result = analyzeWorkflow(`${meta}const answer = ;\n`);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(2);
    expect(result.error.message).toBe('Unexpected token');
  });

  it('accepts top-level await and return, as Claude Code does', () => {
    expect(analyzeWorkflow(`${meta}const done = await agent('Go');\nreturn done;\n`).ok).toBe(true);
  });

  it('still draws a script whose meta block doesn’t read', () => {
    const result = analyzeWorkflow(`await agent('Go');\nexport const meta = { name: 'late' };\n`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.header).toBeNull();
    // The misplaced meta block is still the header, not a step.
    expect(kinds(result.steps)).toEqual(['agent']);
  });
});

describe('helpers', () => {
  it('inlines a helper that runs agents once per call site', () => {
    const diagram = analyze(`
async function review(file) {
  return agent(\`Review \${file}\`, { label: \`Review \${file}\` });
}
const first = await review('a.ts');
const second = await review('b.ts');
`);

    const helpers = diagram.steps.filter((step): step is HelperStep => step.kind === 'helper');
    expect(helpers).toHaveLength(2);
    expect(helpers.map((helper) => helper.result)).toEqual(['first', 'second']);
    for (const helper of helpers) {
      expect(helper).toMatchObject({ name: 'review', definedOn: 3, status: 'expanded' });
      expect(expectKind(helper.steps[0], 'agent').title).toBe('Review ${file}');
    }
    // Counted by call site, not by how often the diagram draws it.
    expect(diagram.summary.agentCalls).toBe(1);
  });

  it('inlines a const arrow helper and a helper that only calls another helper', () => {
    const diagram = analyze(`
const ask = (question) => agent(question);
const askTwice = async (question) => [await ask(question), await ask(question)];
await askTwice('Why?');
`);

    const outer = expectKind(diagram.steps[0], 'helper');
    expect(outer.name).toBe('askTwice');
    expect(kinds(outer.steps)).toEqual(['helper', 'helper']);
    expect(expectKind(expectKind(outer.steps[0], 'helper').steps[0], 'agent').title).toBe(
      '${question}',
    );
  });

  it('stops at a helper that calls itself', () => {
    const diagram = analyze(`
async function explore(node) {
  await agent(\`Read \${node.name}\`);
  for (const child of node.children) {
    await explore(child);
  }
}
await explore(args.root);
`);

    const outer = expectKind(diagram.steps[0], 'helper');
    expect(outer.status).toBe('expanded');
    const loop = expectKind(outer.steps[1], 'loop');
    expect(loop.header).toBe('for (const child of node.children)');
    expect(expectKind(loop.steps[0], 'helper')).toMatchObject({
      name: 'explore',
      status: 'recursive',
    });
  });

  it('keeps plain helpers as code and says when a helper with agents is never called', () => {
    const diagram = analyze(`
function format(text) {
  return text.trim();
}
async function forgotten() {
  await agent('Never runs');
}
await agent(format(' Go '));
`);

    const [plain, unused, agent] = diagram.steps;
    expect(expectKind(plain, 'code').muted).toBe(true);
    expect(expectKind(unused, 'code')).toMatchObject({ muted: false });
    expect((unused as CodeStep).note).toContain('nothing calls it');
    expect(expectKind(agent, 'agent').title).toBe("${format(' Go ')}");
  });
});

describe('fan-outs and parallel work', () => {
  it('draws parallel over a mapped list as one template branch', () => {
    const diagram = analyze(`
const results = await parallel(args.items.map((item) => () => agent(\`Check \${item}\`)));
`);

    expect(expectKind(diagram.steps[0], 'fan-out')).toMatchObject({
      via: 'parallel',
      over: 'args.items',
      item: 'item',
      result: 'results',
    });
    expect(diagram.summary.fanOuts).toBe(1);
  });

  it('draws a fixed list of thunks as side-by-side branches', () => {
    const diagram = analyze(`
const [left, right] = await parallel([
  () => agent('Left', { model: 'haiku' }),
  () => agent('Right', { model: 'opus' }),
]);
`);

    const parallel = expectKind(diagram.steps[0], 'parallel');
    expect(parallel.result).toBe('[left, right]');
    expect(parallel.branches.map((branch) => expectKind(branch.steps[0], 'agent').title)).toEqual([
      'Left',
      'Right',
    ]);
    // A fixed list isn't a fan-out: its size is in the script.
    expect(diagram.summary.fanOuts).toBe(0);
  });

  it('says what a list built elsewhere fans out over, without guessing what it runs', () => {
    const diagram = analyze(`
const tasks = args.files.map((file) => () => agent(file));
await parallel(tasks);
`);

    const fanOut = diagram.steps.find((step): step is FanOutStep => step.kind === 'fan-out');
    expect(fanOut).toMatchObject({ over: 'tasks', branch: [] });
  });

  it('treats Promise.all over a mapped list as a fan-out of started work', () => {
    const diagram = analyze(`
await Promise.all(args.files.map((file) => agent(\`Lint \${file}\`)));
`);

    const fanOut = expectKind(diagram.steps[0], 'fan-out');
    expect(fanOut).toMatchObject({ via: 'Promise.all', over: 'args.files', item: 'file' });
    expect(expectKind(fanOut.branch[0], 'agent').title).toBe('Lint ${file}');
  });
});

describe('pipelines', () => {
  it('gives each stage its own steps, including a helper and a nested parallel', () => {
    const diagram = analyze(`
async function publish(draft) {
  return agent(\`Publish \${draft.title}\`, { isolation: 'worktree' });
}
const done = await pipeline(
  args.topics,
  (topic) => agent(\`Draft \${topic}\`, { label: 'Draft', effort: 'low' }),
  (draft, topic) =>
    parallel([
      () => agent('Check facts', { agentType: 'fact-checker' }),
      () => agent('Check tone'),
    ]),
  publish,
);
`);

    const pipeline = expectKind(diagram.steps[0], 'pipeline') as PipelineStep;
    expect(pipeline).toMatchObject({ over: 'args.topics', result: 'done' });
    expect(pipeline.stages.map((stage) => stage.parameters)).toEqual([
      '(topic)',
      '(draft, topic)',
      'publish',
    ]);

    expect(expectKind(pipeline.stages[0]?.steps[0], 'agent')).toMatchObject({
      title: 'Draft',
      effort: { text: 'low', dynamic: false },
    });

    const nested = expectKind(pipeline.stages[1]?.steps[0], 'parallel') as ParallelStep;
    expect(nested.branches).toHaveLength(2);
    expect(expectKind(nested.branches[0]?.steps[0], 'agent').agentType).toEqual({
      text: 'fact-checker',
      dynamic: false,
    });

    const helper = expectKind(pipeline.stages[2]?.steps[0], 'helper');
    expect(expectKind(helper.steps[0], 'agent').isolation).toEqual({
      text: 'worktree',
      dynamic: false,
    });
    expect(diagram.summary.fanOuts).toBe(1);
  });
});

describe('branches and loops', () => {
  it('flattens an if, else if, else chain into arms', () => {
    const diagram = analyze(`
if (args.mode === 'quick') {
  await agent('Skim it', { model: 'haiku' });
} else if (args.mode === 'deep') {
  await agent('Read every line', { model: 'opus' });
} else {
  log('Nothing to do');
}
`);

    const branch = expectKind(diagram.steps[0], 'branch') as BranchStep;
    expect(branch.arms.map(({ kind, test }) => ({ kind, test }))).toEqual([
      { kind: 'if', test: "args.mode === 'quick'" },
      { kind: 'else if', test: "args.mode === 'deep'" },
      { kind: 'else', test: null },
    ]);
    expect(kinds(branch.arms[2]?.steps ?? [])).toEqual(['log']);
  });

  it('runs a condition’s agents before the branch they decide', () => {
    const diagram = analyze(`
if ((await agent('Is it broken?', { schema: { type: 'object', properties: { broken: { type: 'boolean' } } } }))?.broken) {
  await agent('Fix it');
}
`);

    expect(kinds(diagram.steps)).toEqual(['agent', 'branch']);
  });

  it('draws a ternary that picks between agents as a branch', () => {
    const diagram = analyze(
      `const answer = args.fast ? await agent('Fast') : await agent('Slow');\n`,
    );

    const branch = expectKind(diagram.steps[0], 'branch');
    expect(branch.arms.map((arm) => arm.kind)).toEqual(['if', 'else']);
  });

  it('keeps a branch with no agents as quiet code', () => {
    const diagram = analyze(`
let count = 0;
if (args.extra) {
  count += 1;
}
`);

    expect(kinds(diagram.steps)).toEqual(['code']);
    expect(expectKind(diagram.steps[0], 'code').statements).toHaveLength(2);
  });

  it('gives each kind of loop its header as written', () => {
    const diagram = analyze(`
for (let attempt = 0; attempt < 3; attempt += 1) {
  await agent('Try again');
}
for (const file of args.files) {
  await agent(\`Read \${file}\`);
}
let remaining = args.budget;
while (remaining > 0) {
  remaining -= (await agent('Spend some'))?.cost ?? 1;
}
`);

    const loops = diagram.steps.filter((step): step is LoopStep => step.kind === 'loop');
    expect(loops.map((loop) => loop.header)).toEqual([
      'for (let attempt = 0; attempt < 3; attempt += 1)',
      'for (const file of args.files)',
      'while (remaining > 0)',
    ]);
  });

  it('draws a try block that runs agents', () => {
    const diagram = analyze(`
try {
  await agent('Risky');
} catch (error) {
  log(\`Failed: \${error.message}\`);
}
`);

    const block = expectKind(diagram.steps[0], 'try');
    expect(kinds(block.steps)).toEqual(['agent']);
    expect(block.handler?.parameter).toBe('error');
    expect(kinds(block.handler?.steps ?? [])).toEqual(['log']);
  });
});

describe('other calls', () => {
  it('draws nested workflows, logs, and the output', () => {
    const diagram = analyze(`
const notes = await workflow('release-notes', { since: args.tag });
log(\`Wrote \${notes.length} notes\`);
return notes;
`);

    expect(expectKind(diagram.steps[0], 'workflow')).toMatchObject({
      reference: 'release-notes',
      dynamic: false,
      result: 'notes',
    });
    expect(expectKind(diagram.steps[1], 'log').message).toBe('Wrote ${notes.length} notes');
    expect(expectKind(diagram.steps[2], 'return').expression).toBe('notes');
  });

  it('splits sections at each phase call and leaves a phase with no meta entry without detail', () => {
    const diagram = analyze(
      `phase('Plan');\nawait agent('Plan it');\nphase('Ship');\nawait agent('Ship it');\n`,
      `export const meta = { name: 't', description: 'd', phases: [{ title: 'Plan', detail: 'Think first' }] };\n`,
    );

    const phases = diagram.steps.map((step) => expectKind(step, 'phase') as PhaseStep);
    expect(phases.map(({ title, detail }) => ({ title, detail }))).toEqual([
      { title: 'Plan', detail: 'Think first' },
      { title: 'Ship', detail: null },
    ]);
    expect(diagram.summary.phases).toBe(1);
  });
});

describe('options the diagram can’t read', () => {
  it('marks a runtime option, but not a templated label, as unreadable', () => {
    const diagram = analyze(`
await agent('One', { label: \`Step \${args.step}\`, model: 'sonnet' });
await agent('Two', { model: args.model });
await agent('Three', args.options);
await agent('Four');
`);

    const agents = diagram.steps.filter((step): step is AgentStep => step.kind === 'agent');
    expect(agents.map((agent) => agent.unreadOptions)).toEqual([false, true, true, false]);
    expect(agents[1]?.model).toEqual({ text: 'args.model', dynamic: true });
    expect(diagram.summary).toMatchObject({
      agentCalls: 4,
      unreadOptions: 2,
      sessionModelAgents: 1,
      models: ['sonnet'],
    });
  });

  it('reads options written as a top-level constant', () => {
    const diagram = analyze(`
const QUICK = { label: 'Quick look', model: 'haiku' };
await agent('Look', QUICK);
`);

    expect(expectKind(diagram.steps[1], 'agent')).toMatchObject({
      title: 'Quick look',
      model: { text: 'haiku', dynamic: false },
      unreadOptions: false,
    });
  });
});

describe('textParts', () => {
  it('splits placeholders out of plain text, matching nested braces', () => {
    expect(textParts('Review ${file} with ${format({ short: true })}.')).toEqual([
      { text: 'Review ', placeholder: false },
      { text: '${file}', placeholder: true },
      { text: ' with ', placeholder: false },
      { text: '${format({ short: true })}', placeholder: true },
      { text: '.', placeholder: false },
    ]);
  });

  it('leaves a placeholder cut short as plain text', () => {
    expect(textParts('Summarize ${JSON.stri…')).toEqual([
      { text: 'Summarize ${JSON.stri…', placeholder: false },
    ]);
  });
});
