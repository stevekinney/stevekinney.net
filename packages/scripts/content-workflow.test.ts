import { describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile, chmod, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { repositoryRoot } from './content-paths.ts';
import { runContentCommand } from './run-with-content-history.ts';

const runGit = async (
  cwd: string,
  argumentsList: string[],
  environment?: Record<string, string | undefined>,
): Promise<string> => {
  const child = Bun.spawn(['git', ...argumentsList], {
    cwd,
    env: environment,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(error.trim());
  return output.trim();
};

const withEnvironment = async <T>(
  values: Record<string, string | undefined>,
  callback: () => Promise<T>,
): Promise<T> => {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const createGitRepository = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'content-workflow-source-'));
  await runGit(root, ['init', '-q']);
  await runGit(root, ['config', 'user.email', 'test@example.com']);
  await runGit(root, ['config', 'user.name', 'Test']);
  await mkdir(path.join(root, 'writing'));
  await writeFile(path.join(root, 'writing', 'post.md'), '---\ntitle: Post\n---\n\nBody\n');
  await runGit(root, ['add', '.']);
  await runGit(root, ['commit', '-qm', 'initial'], {
    ...process.env,
    GIT_AUTHOR_DATE: '2024-01-01T00:00:00Z',
    GIT_COMMITTER_DATE: '2024-01-01T00:00:00Z',
  });
  return root;
};

describe('content workflow entrypoints', () => {
  test('propagates validation failures instead of ignoring a background process exit', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'content-workflow-'));
    try {
      const executable = path.join(root, 'bun');
      await writeFile(
        executable,
        '#!/bin/sh\nif [ "$2" = "content:validate" ]; then exit 7; fi\nexit 0\n',
      );
      await chmod(executable, 0o755);
      const manifest = JSON.parse(
        await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
      );
      const child = Bun.spawn(['sh', '-c', manifest.scripts['continuous-integration:validate']], {
        cwd: root,
        env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
        stdout: 'pipe',
        stderr: 'pipe',
      });
      expect(await child.exited).toBe(7);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test('captures the real Git revision before invoking a child and preserves its exit code', async () => {
    expect(
      await runContentCommand(
        [
          process.execPath,
          '-e',
          'process.exit(/^[0-9a-f]{40}$/.test(process.env.CONTENT_GIT_REVISION ?? "") ? 23 : 1)',
        ],
        repositoryRoot,
      ),
    ).toBe(23);
  });

  test.serial('rejects a shallow checkout outside Vercel without fetching', async () => {
    const source = await createGitRepository();
    const shallow = await mkdtemp(path.join(tmpdir(), 'content-workflow-shallow-'));
    try {
      await runGit(tmpdir(), ['clone', '--depth', '1', `file://${source}`, shallow]);
      await withEnvironment({ VERCEL: undefined }, async () => {
        await expect(runContentCommand(['sh', '-c', 'exit 0'], shallow)).rejects.toThrow(
          /full history/i,
        );
      });
      expect(await runGit(shallow, ['rev-parse', '--is-shallow-repository'])).toBe('true');
    } finally {
      await rm(source, { recursive: true, force: true });
      await rm(shallow, { recursive: true, force: true });
    }
  });

  test.serial(
    'unshallows on Vercel and passes the explicit fetched HEAD to the child',
    async () => {
      const source = await createGitRepository();
      const shallow = await mkdtemp(path.join(tmpdir(), 'content-workflow-vercel-'));
      try {
        await runGit(tmpdir(), ['clone', '--depth', '1', `file://${source}`, shallow]);
        const expectedRevision = await runGit(shallow, ['rev-parse', 'HEAD']);
        await withEnvironment({ VERCEL: '1', EXPECTED_REVISION: expectedRevision }, async () => {
          const exitCode = await runContentCommand(
            ['sh', '-c', 'test "$CONTENT_GIT_REVISION" = "$EXPECTED_REVISION"'],
            shallow,
          );
          expect(exitCode).toBe(0);
        });
        expect(await runGit(shallow, ['rev-parse', '--is-shallow-repository'])).toBe('false');
      } finally {
        await rm(source, { recursive: true, force: true });
        await rm(shallow, { recursive: true, force: true });
      }
    },
  );

  test.serial('includes CONTENT_GIT_REVISION in Turbo cache hashing', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'content-workflow-turbo-'));
    try {
      await mkdir(path.join(root, 'packages', 'fixture'), { recursive: true });
      await writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({
          name: 'content-workflow-turbo-fixture',
          private: true,
          packageManager: 'bun@1.3.2',
          workspaces: ['packages/*'],
        }),
      );
      await writeFile(
        path.join(root, 'packages', 'fixture', 'package.json'),
        JSON.stringify({ name: 'fixture', scripts: { check: 'exit 0' } }),
      );
      await writeFile(
        path.join(root, 'turbo.json'),
        JSON.stringify({
          $schema: 'https://turbo.build/schema.json',
          tasks: { check: {} },
          globalEnv: ['CONTENT_GIT_REVISION'],
        }),
      );
      const turbo = path.resolve(repositoryRoot, 'node_modules/.bin/turbo');
      const hashes = await Promise.all(
        ['revision-a', 'revision-b'].map(async (revision) => {
          const child = Bun.spawn([turbo, 'run', 'check', '--dry=json', '--output-logs=none'], {
            cwd: root,
            env: { ...process.env, CONTENT_GIT_REVISION: revision },
            stdout: 'pipe',
            stderr: 'pipe',
          });
          const [output, error, code] = await Promise.all([
            new Response(child.stdout).text(),
            new Response(child.stderr).text(),
            child.exited,
          ]);
          if (code !== 0) throw new Error(error);
          return JSON.parse(output).tasks[0].hash as string;
        }),
      );
      expect(hashes[0]).not.toBe(hashes[1]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
