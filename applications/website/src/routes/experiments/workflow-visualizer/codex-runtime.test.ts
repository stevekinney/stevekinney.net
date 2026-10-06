import path from 'node:path';

import Ajv from 'ajv';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWorkflowRuntime } from './codex-runtime.js';
import type { RuntimeDependencies, WorkflowConfig } from './codex-runtime.js';

type TurnOptions = { outputSchema?: unknown } | undefined;
type Reply = { finalResponse: string; usage?: { output_tokens: number } | null };
type Handler = (input: string, turnOptions: TurnOptions, threadIndex: number) => Promise<Reply>;

type ThreadRecord = { options: Record<string, unknown>; inputs: string[]; turns: TurnOptions[] };

/** A stand-in for the Codex SDK's client whose threads answer from `handler`. */
const fakeCodex = (handler: Handler) => {
  const threads: ThreadRecord[] = [];
  class Codex {
    startThread(options: Record<string, unknown> = {}) {
      const record: ThreadRecord = { options, inputs: [], turns: [] };
      const index = threads.push(record) - 1;
      return {
        run: async (input: string, turnOptions?: { outputSchema?: unknown }) => {
          record.inputs.push(input);
          record.turns.push(turnOptions);
          const reply = await handler(input, turnOptions, index);
          return { items: [], finalResponse: reply.finalResponse, usage: reply.usage ?? null };
        },
      };
    }
  }
  return { Codex, threads };
};

const reply = (value: unknown, outputTokens = 0): Reply => ({
  finalResponse: typeof value === 'string' ? value : JSON.stringify(value),
  usage: { output_tokens: outputTokens },
});

const baseConfig: WorkflowConfig = {
  models: { inherit: null },
  sandboxMode: 'workspace-write',
  approvalPolicy: 'never',
  workingDirectory: '/project',
  skipGitRepoCheck: false,
  networkAccessEnabled: false,
  concurrency: 4,
  structuredOutputAttempts: 5,
  budgetTotal: null,
};

const unusedNodeModules = {
  childProcess: { execFile: () => undefined },
  fs: { promises: { mkdtemp: async () => '/unused' } },
  os: { tmpdir: () => '/tmp' },
  path,
} satisfies Omit<RuntimeDependencies, 'Codex' | 'Ajv'>;

const createRuntime = (
  handler: Handler,
  config: Partial<WorkflowConfig> = {},
  nodeModules: Omit<RuntimeDependencies, 'Codex' | 'Ajv'> = unusedNodeModules,
) => {
  const { Codex, threads } = fakeCodex(handler);
  const runtime = createWorkflowRuntime(
    { ...baseConfig, ...config },
    { Codex, Ajv: Ajv as unknown as RuntimeDependencies['Ajv'], ...nodeModules },
  );
  return { ...runtime, threads };
};

const FILES = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    base: { type: 'string' },
  },
  required: ['files'],
} as const;

let stderr: string[];
let stdout: string[];

beforeEach(() => {
  stderr = [];
  stdout = [];
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    stderr.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    stdout.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('agent()', () => {
  it('returns the final text without a schema', async () => {
    const { agent, threads } = createRuntime(async () => reply('All done.'));

    await expect(agent('Say you are done.')).resolves.toBe('All done.');
    await expect(agent('And again.', null as never)).resolves.toBe('All done.');
    expect(threads).toHaveLength(2);
    expect(threads[0]?.turns[0]).toBeUndefined();
  });

  it('passes the sandbox, approval policy, and working directory to every thread', async () => {
    const { agent, threads } = createRuntime(async () => reply('ok'), {
      sandboxMode: 'read-only',
      networkAccessEnabled: true,
      skipGitRepoCheck: true,
    });

    await agent('Look around.');

    expect(threads[0]?.options).toEqual({
      sandboxMode: 'read-only',
      approvalPolicy: 'never',
      workingDirectory: '/project',
      skipGitRepoCheck: true,
      networkAccessEnabled: true,
    });
  });

  it('returns null when the Codex turn fails', async () => {
    const { agent } = createRuntime(async () => {
      throw new Error('turn failed: rate limited');
    });

    await expect(agent('Try something.', { label: 'Flaky' })).resolves.toBeNull();
    expect(stderr.join('')).toContain('Flaky failed: turn failed: rate limited');
  });

  it('returns null when starting the thread throws', async () => {
    class BrokenCodex {
      startThread(): never {
        throw new Error('codex binary not found');
      }
    }
    const { agent } = createWorkflowRuntime(baseConfig, {
      Codex: BrokenCodex as unknown as RuntimeDependencies['Codex'],
      Ajv: Ajv as unknown as RuntimeDependencies['Ajv'],
      ...unusedNodeModules,
    });

    await expect(agent('Anything.')).resolves.toBeNull();
  });

  it('sends the strict schema and strips the nulls it introduced', async () => {
    const { agent, threads } = createRuntime(async () => reply({ files: ['a.ts'], base: null }));

    await expect(agent('List files.', { schema: FILES })).resolves.toEqual({ files: ['a.ts'] });
    expect(threads[0]?.turns[0]).toEqual({
      outputSchema: {
        type: 'object',
        properties: {
          files: { type: 'array', items: { type: 'string' } },
          base: { type: ['string', 'null'] },
        },
        required: ['files', 'base'],
        additionalProperties: false,
      },
    });
  });

  it('keeps a null the original schema allows', async () => {
    const schema = {
      type: 'object',
      properties: { note: { type: ['string', 'null'] } },
    };
    const { agent } = createRuntime(async () => reply({ note: null }));

    await expect(agent('Maybe a note.', { schema })).resolves.toEqual({ note: null });
  });

  it('asks again on the same thread when a reply fails validation', async () => {
    let call = 0;
    const { agent, threads } = createRuntime(async () => {
      call += 1;
      return call === 1 ? reply({ files: 'not a list' }) : reply({ files: ['b.ts'], base: 'main' });
    });

    await expect(agent('List files.', { schema: FILES })).resolves.toEqual({
      files: ['b.ts'],
      base: 'main',
    });
    expect(threads).toHaveLength(1);
    expect(threads[0]?.inputs).toHaveLength(2);
    expect(threads[0]?.inputs[1]).toContain('reply/files must be array');
  });

  it('throws naming the last validation failure once the attempts run out', async () => {
    const { agent, threads } = createRuntime(async () => reply({ files: [1] }), {
      structuredOutputAttempts: 3,
    });

    await expect(agent('List files.', { label: 'List', schema: FILES })).rejects.toThrow(
      /"List" didn't return output that matches its schema after 3 attempts: reply\/files\/0 must be string/,
    );
    expect(threads[0]?.inputs).toHaveLength(3);
  });

  it('retries a reply that is not JSON', async () => {
    let call = 0;
    const { agent } = createRuntime(async () => {
      call += 1;
      return call === 1 ? reply('Here you go: files') : reply({ files: [], base: null });
    });

    await expect(agent('List files.', { schema: FILES })).resolves.toEqual({ files: [] });
  });

  it('checks constraints strict mode drops against the original schema', async () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string', minLength: 3 } },
      required: ['name'],
    };
    let call = 0;
    const { agent, threads } = createRuntime(async () => {
      call += 1;
      return reply({ name: call === 1 ? 'ab' : 'abc' });
    });

    await expect(agent('Name it.', { schema })).resolves.toEqual({ name: 'abc' });
    expect(threads[0]?.turns[0]?.outputSchema).toEqual({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    });
  });

  it('rejects a schema whose root is not an object', async () => {
    const { agent } = createRuntime(async () => reply('[]'));

    await expect(
      agent('List.', { label: 'Bad', schema: { type: 'array' } as unknown as typeof FILES }),
    ).rejects.toThrow('The schema for "Bad" must be an object schema with properties');
  });

  it('maps effort names to Codex reasoning effort', async () => {
    const { agent, threads } = createRuntime(async () => reply('ok'));

    await agent('Think hard.', { effort: 'xhigh' });
    await agent('Think a little.', { effort: 'low' });
    await agent('Think as usual.');
    await agent('Think oddly.', { effort: 'ludicrous' });

    expect(threads.map((thread) => thread.options['modelReasoningEffort'])).toEqual([
      'xhigh',
      'low',
      undefined,
      undefined,
    ]);
    expect(stderr.join('')).toContain('Unknown effort "ludicrous" is ignored.');
  });

  it('maps Claude model names through CONFIG.models', async () => {
    const { agent, threads } = createRuntime(async () => reply('ok'), {
      models: { inherit: 'gpt-inherited', sonnet: null, opus: 'gpt-large' },
    });

    await agent('No model.');
    await agent('Sonnet.', { model: 'sonnet' });
    await agent('Opus.', { model: 'opus' });
    await agent('Haiku.', { model: 'haiku' });
    await agent('Haiku again.', { model: 'haiku' });

    expect(threads.map((thread) => thread.options['model'])).toEqual([
      'gpt-inherited',
      undefined,
      'gpt-large',
      undefined,
      undefined,
    ]);
    const warnings = stderr.filter((line) => line.includes('no entry for "haiku"'));
    expect(warnings).toHaveLength(1);
  });

  it('warns once per unsupported option and keeps going', async () => {
    const { agent } = createRuntime(async () => reply('ok'));

    await agent('One.', { agentType: 'reviewer', stallMs: 1000 });
    await agent('Two.', { agentType: 'reviewer', disallowedTools: ['Bash'] });
    await expect(agent('Three.', { bashCommandClamp: ['Bash(git:*)'] })).resolves.toBe('ok');

    const output = stderr.join('');
    for (const option of ['agentType', 'stallMs', 'disallowedTools', 'bashCommandClamp'])
      expect(output.split(`option ${option} is ignored`)).toHaveLength(2);
  });

  it('throws on an isolation other than worktree', async () => {
    const { agent } = createRuntime(async () => reply('ok'));

    await expect(agent('Remote.', { isolation: 'remote' })).rejects.toThrow(
      "isolation: 'remote' isn't available",
    );
  });

  it('runs a worktree agent in a new git worktree and leaves it there', async () => {
    const execFile = vi.fn(
      (
        _file: string,
        _args: string[],
        _options: { cwd: string },
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => callback(null, '', ''),
    );
    const { agent, threads } = createRuntime(
      async () => reply('edited'),
      {},
      {
        childProcess: { execFile },
        fs: { promises: { mkdtemp: async (prefix: string) => `${prefix}Ab12Cd` } },
        os: { tmpdir: () => '/tmp' },
        path,
      },
    );

    await expect(agent('Edit it.', { label: 'Edit', isolation: 'worktree' })).resolves.toBe(
      'edited',
    );

    expect(execFile).toHaveBeenCalledWith(
      'git',
      [
        'worktree',
        'add',
        '-b',
        'codex-workflow/Ab12Cd',
        '/tmp/codex-workflow-Ab12Cd/worktree',
        'HEAD',
      ],
      { cwd: '/project' },
      expect.any(Function),
    );
    expect(threads[0]?.options['workingDirectory']).toBe('/tmp/codex-workflow-Ab12Cd/worktree');
    expect(stderr.join('')).toContain('[worktree] Edit: /tmp/codex-workflow-Ab12Cd/worktree');
  });

  it('throws when git cannot create the worktree', async () => {
    const { agent } = createRuntime(
      async () => reply('edited'),
      {},
      {
        childProcess: {
          execFile: (_file, _args, _options, callback) =>
            callback(new Error('exit 128'), '', 'fatal: not a git repository'),
        },
        fs: { promises: { mkdtemp: async (prefix: string) => `${prefix}x` } },
        os: { tmpdir: () => '/tmp' },
        path,
      },
    );

    await expect(agent('Edit.', { label: 'Edit', isolation: 'worktree' })).rejects.toThrow(
      'Couldn\'t create a worktree for "Edit": fatal: not a git repository',
    );
  });

  it('throws once a run has started 1,000 agents', async () => {
    const { agent } = createRuntime(async () => reply('ok'), { concurrency: 256 });

    await Promise.all(Array.from({ length: 1000 }, (_, index) => agent(`Agent ${index}.`)));

    await expect(agent('One too many.')).rejects.toThrow(
      'This run has already started 1000 agents',
    );
  });
});

describe('concurrency', () => {
  it('never runs more agents at once than CONFIG.concurrency', async () => {
    let active = 0;
    let peak = 0;
    const { parallel, agent } = createRuntime(
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return reply('ok');
      },
      { concurrency: 2 },
    );

    const results = await parallel(
      Array.from({ length: 7 }, (_, index) => () => agent(`${index}`)),
    );

    expect(results).toEqual(Array(7).fill('ok'));
    expect(peak).toBe(2);
  });
});

describe('parallel()', () => {
  it('turns a throw into null for that item', async () => {
    const { parallel } = createRuntime(async () => reply('ok'));

    const results = await parallel([
      () => 1,
      () => {
        throw new Error('sync failure');
      },
      async () => {
        throw new Error('async failure');
      },
      async () => 'four',
    ]);

    expect(results).toEqual([1, null, null, 'four']);
    expect(stderr.join('')).toContain('parallel() item 2 threw and became null: async failure');
  });

  it('accepts 4,096 items and refuses 4,097', async () => {
    const { parallel } = createRuntime(async () => reply('ok'));

    await expect(parallel(Array(4096).fill(() => 1))).resolves.toHaveLength(4096);
    await expect(parallel(Array(4097).fill(() => 1))).rejects.toThrow(
      'parallel() got 4097 items; one call takes at most 4096.',
    );
  });
});

describe('pipeline()', () => {
  it('passes the previous result, the item, and its index to each stage', async () => {
    const { pipeline } = createRuntime(async () => reply('ok'));
    const calls: unknown[][] = [];

    const results = await pipeline(
      ['a', 'b'],
      (previous: string, item: string, index: number) => {
        calls.push(['first', previous, item, index]);
        return `${previous}1`;
      },
      async (previous: string, item: string, index: number) => {
        calls.push(['second', previous, item, index]);
        return `${previous}2`;
      },
    );

    expect(results).toEqual(['a12', 'b12']);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['first', 'a', 'a', 0],
        ['first', 'b', 'b', 1],
        ['second', 'a1', 'a', 0],
        ['second', 'b1', 'b', 1],
      ]),
    );
  });

  it('drops an item to null when a stage throws, and skips its later stages', async () => {
    const { pipeline } = createRuntime(async () => reply('ok'));
    const second = vi.fn((previous: number) => previous * 10);

    const results = await pipeline(
      [1, 2, 3],
      (item: number) => {
        if (item === 2) throw new Error('no twos');
        return item;
      },
      second,
    );

    expect(results).toEqual([10, null, 30]);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('lets an item reach a later stage before another finishes the first', async () => {
    const { pipeline } = createRuntime(async () => reply('ok'));
    let releaseSlowItem = (): void => undefined;
    const slowItemGate = new Promise<void>((resolve) => {
      releaseSlowItem = resolve;
    });

    const results = await pipeline(
      ['fast', 'slow'],
      async (item: string) => {
        if (item === 'slow') await slowItemGate;
        return item;
      },
      (previous: string) => {
        if (previous === 'fast') releaseSlowItem();
        return previous.toUpperCase();
      },
    );

    expect(results).toEqual(['FAST', 'SLOW']);
  });

  it('refuses more than 4,096 items', async () => {
    const { pipeline } = createRuntime(async () => reply('ok'));

    await expect(pipeline(Array(4097).fill(0), (item: number) => item)).rejects.toThrow(
      'pipeline() got 4097 items',
    );
  });
});

describe('phase(), log(), and workflow()', () => {
  it('writes progress to stderr and nothing to stdout', () => {
    const { phase, log } = createRuntime(async () => reply('ok'));

    phase('Review');
    log('3 files to review');

    expect(stderr).toEqual(['[phase] Review\n', '[log] 3 files to review\n']);
    expect(stdout).toEqual([]);
  });

  it('throws for a nested workflow, naming it', async () => {
    const { workflow } = createRuntime(async () => reply('ok'));

    await expect(workflow('triage-issues')).rejects.toThrow(
      "Nested workflows aren't converted. Convert triage-issues too",
    );
    await expect(workflow({ scriptPath: './other.js' })).rejects.toThrow('Convert ./other.js too');
  });
});

describe('budget', () => {
  it('sums output tokens across agents and reports what remains', async () => {
    let call = 0;
    const { agent, budget } = createRuntime(
      async () => {
        call += 1;
        return { finalResponse: 'ok', usage: { output_tokens: call === 1 ? 100 : 50 } };
      },
      { budgetTotal: 1000 },
    );

    expect(budget.total).toBe(1000);
    expect(budget.spent()).toBe(0);
    await agent('One.');
    await agent('Two.');

    expect(budget.spent()).toBe(150);
    expect(budget.remaining()).toBe(850);
  });

  it('counts a retried thread by what grew, since Codex reports running totals', async () => {
    let call = 0;
    const { agent, budget } = createRuntime(async () => {
      call += 1;
      return call === 1 ? reply({ files: 'nope' }, 100) : reply({ files: [], base: null }, 160);
    });

    await agent('List files.', { schema: FILES });

    expect(budget.spent()).toBe(160);
  });

  it('has no total and infinite room by default', () => {
    const { budget } = createRuntime(async () => reply('ok'));

    expect(budget.total).toBeNull();
    expect(budget.remaining()).toBe(Infinity);
  });
});
