import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { defaultCodexExportOptions } from './codex-export-options';
import { generateCodexWorkflow } from './codex-export';
import sample from './sample.workflow.js?raw';

/**
 * Runs a generated export with Node against a stand-in `@openai/codex-sdk` that
 * answers each prompt with canned JSON, so the file is proven to parse and run
 * to a result without the network or a real Codex.
 */

const FAKE_SDK = `
import { appendFileSync } from 'node:fs';

const record = (entry) => appendFileSync(process.env.FAKE_CODEX_LOG, JSON.stringify(entry) + '\\n');

const answer = (input) => {
  if (input.startsWith('List the files changed')) return { files: ['src/a.ts', 'src/b.ts'], base: null };
  if (input.startsWith('Review src/a.ts'))
    return { findings: [{ line: 3, severity: 'high', summary: 'Off by one', suggestion: null }] };
  if (input.startsWith('Review src/b.ts')) return { findings: [] };
  if (input.startsWith('Try to disprove')) return { real: true, reason: 'Reproduced it' };
  if (input.startsWith('Rank these findings')) return 'One high-severity bug in src/a.ts.';
  throw new Error('unexpected prompt: ' + input.slice(0, 40));
};

export class Codex {
  startThread(options = {}) {
    return {
      async run(input, turnOptions = {}) {
        record({ options, input, outputSchema: turnOptions.outputSchema ?? null });
        const reply = answer(input);
        return {
          items: [],
          finalResponse: typeof reply === 'string' ? reply : JSON.stringify(reply),
          usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5, reasoning_output_tokens: 2 },
        };
      },
    };
  }
}
`;

let folder: string;

const run = (fileName: string, text: string, argv: string[]) => {
  const file = path.join(folder, fileName);
  const log = path.join(folder, `${fileName}.log`);
  writeFileSync(file, text);
  writeFileSync(log, '');
  // The export runs in plain Node, so drop the test runner's NODE_OPTIONS (`--import tsx`),
  // which can't resolve from the temporary folder.
  const environment = { ...process.env };
  delete environment['NODE_OPTIONS'];
  const result = spawnSync('node', [file, ...argv], {
    cwd: folder,
    encoding: 'utf8',
    env: { ...environment, FAKE_CODEX_LOG: log, WORKFLOW_MAX_CONCURRENT_AGENTS: '3' },
    timeout: 30_000,
  });
  const calls = readFileSync(log, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as {
          options: Record<string, unknown>;
          input: string;
          outputSchema: unknown;
        },
    );
  return { ...result, calls };
};

beforeAll(() => {
  // The real path, since `process.cwd()` in the export resolves macOS's /var link.
  folder = realpathSync(mkdtempSync(path.join(tmpdir(), 'codex-export-run-')));
  const sdk = path.join(folder, 'node_modules', '@openai', 'codex-sdk');
  mkdirSync(sdk, { recursive: true });
  writeFileSync(
    path.join(sdk, 'package.json'),
    JSON.stringify({ name: '@openai/codex-sdk', type: 'module', exports: './index.js' }),
  );
  writeFileSync(path.join(sdk, 'index.js'), FAKE_SDK);
  // The real Ajv, linked in; Node follows the link to find its own dependencies.
  const ajv = path.dirname(createRequire(import.meta.url).resolve('ajv/package.json'));
  symlinkSync(ajv, path.join(folder, 'node_modules', 'ajv'), 'dir');
});

afterAll(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('running the export for the sample', () => {
  const generated = generateCodexWorkflow(sample, {
    ...defaultCodexExportOptions,
    models: { opus: 'gpt-test-large', haiku: 'gpt-test-small' },
  });
  if (!generated.ok) throw new Error(generated.error);

  it('runs to a JSON result on stdout, with the nulls Codex had to send removed', () => {
    const result = run(generated.fileName, generated.text, ['{"base":"main"}']);

    expect(result.stderr).not.toContain('Error');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      reviewed: 2,
      failed: 0,
      findings: [
        {
          file: 'src/a.ts',
          line: 3,
          severity: 'high',
          summary: 'Off by one',
          verdict: { real: true, reason: 'Reproduced it' },
        },
      ],
      summary: 'One high-severity bug in src/a.ts.',
    });
  });

  it('writes the phases and log lines to stderr', () => {
    const { stderr } = run(generated.fileName, generated.text, []);

    expect(stderr).toContain('[phase] Collect\n');
    expect(stderr).toContain('[phase] Review\n');
    expect(stderr).toContain('[phase] Summarize\n');
    expect(stderr).toContain('[log] 1 confirmed findings in 2 files (0 reviews failed)\n');
  });

  it('starts each thread with the mapped model, effort, sandbox, and a strict schema', () => {
    const { calls } = run(generated.fileName, generated.text, []);
    const byPrompt = (start: string) => calls.find((call) => call.input.startsWith(start));

    expect(calls).toHaveLength(5);
    expect(byPrompt('List the files changed on this branch compared with main.')).toMatchObject({
      options: {
        model: 'gpt-test-small',
        sandboxMode: 'workspace-write',
        approvalPolicy: 'never',
        networkAccessEnabled: false,
        workingDirectory: folder,
      },
      outputSchema: {
        properties: { base: { type: ['string', 'null'] } },
        required: ['files', 'base'],
        additionalProperties: false,
      },
    });
    expect(byPrompt('Review src/a.ts')?.options).toMatchObject({ modelReasoningEffort: 'high' });
    expect(byPrompt('Review src/a.ts')?.options).not.toHaveProperty('model');
    expect(byPrompt('Try to disprove')?.options).not.toHaveProperty('model');
    expect(byPrompt('Rank these findings')).toMatchObject({
      options: { model: 'gpt-test-large' },
      outputSchema: null,
    });
  });

  it('exits with an error when the argument is not JSON', () => {
    const result = run(generated.fileName, generated.text, ['main']);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('The first argument must be JSON');
  });
});

describe('running an export that throws', () => {
  it('exits non-zero with the error on stderr and nothing on stdout', () => {
    const generated = generateCodexWorkflow(
      "export const meta = { name: 'nested', description: 'Calls another' };\nreturn workflow('triage', args);\n",
      defaultCodexExportOptions,
    );
    if (!generated.ok) throw new Error(generated.error);

    const result = run(generated.fileName, generated.text, []);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain("Nested workflows aren't converted. Convert triage too");
  });
});
