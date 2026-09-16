import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'bun:test';

import { collectContentHistory } from './git-history.ts';

const repositories: string[] = [];

const run = async (
  repositoryRoot: string,
  arguments_: string[],
  environment?: Record<string, string>,
  input?: string,
): Promise<void> => {
  const process = Bun.spawn(['git', ...arguments_], {
    cwd: repositoryRoot,
    stdin: input === undefined ? undefined : 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: environment,
  });
  if (input !== undefined) {
    process.stdin.write(input);
    process.stdin.end();
  }
  if ((await process.exited) !== 0) throw new Error(await new Response(process.stderr).text());
};

const commitAt = async (repositoryRoot: string, message: string, date: string): Promise<void> => {
  await run(repositoryRoot, ['add', '.']);
  await run(repositoryRoot, ['commit', '-qm', message], {
    ...process.env,
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  } as Record<string, string>);
};

const createRepository = async (): Promise<string> => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), 'content-history-'));
  repositories.push(repositoryRoot);
  await run(repositoryRoot, ['init', '-q']);
  await run(repositoryRoot, ['config', 'user.email', 'tests@example.com']);
  await run(repositoryRoot, ['config', 'user.name', 'Tests']);
  return repositoryRoot;
};

const commit = async (repositoryRoot: string, message: string, date: string): Promise<void> => {
  await commitAt(repositoryRoot, message, date);
};

afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((repositoryRoot) => rm(repositoryRoot, { recursive: true })),
  );
});

describe('collectContentHistory', () => {
  test('tracks semantic Markdown changes and ignores obsolete metadata', async () => {
    const repositoryRoot = await createRepository();
    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    const file = path.join(repositoryRoot, 'writing', 'post.md');
    await writeFile(
      file,
      '---\ntitle: One\ndescription: A\ndate: 2024-01-01\nmodified: old\n---\n\nBody\r\n',
    );
    await commit(repositoryRoot, 'add', '2024-01-02T10:00:00Z');
    await writeFile(
      file,
      '---\ndescription: A\ntitle: One\ndate: 2024-01-01\ntags: [new]\n---\n\nBody\n',
    );
    await commit(repositoryRoot, 'metadata', '2024-01-03T10:00:00Z');
    await writeFile(
      file,
      '---\ntitle: " One "\ndescription: " A "\ndate: 2024-01-01T00:00:00Z\n---\n\nBody\n',
    );
    await commit(repositoryRoot, 'canonical metadata', '2024-01-03T12:00:00Z');
    await writeFile(file, '---\ntitle: Two\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'change', '2024-01-04T10:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.modified.get('writing/post.md')).toBe('2024-01-04T10:00:00.000Z');
    expect(history.published.get('writing/post.md')).toBe('2024-01-02');
  });

  test('rejects repositories without a HEAD commit', async () => {
    const repositoryRoot = await createRepository();
    await expect(collectContentHistory(repositoryRoot, 'HEAD')).rejects.toThrow(/no HEAD/i);
  });

  test('carries modified and published dates through a pure rename, then advances on edit', async () => {
    const repositoryRoot = await createRepository();
    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    const original = path.join(repositoryRoot, 'writing', 'old.md');
    const renamed = path.join(repositoryRoot, 'writing', 'new.md');
    await writeFile(original, '---\ntitle: One\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'add', '2024-01-01T00:00:00Z');
    await writeFile(original, '---\ntitle: Two\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'edit', '2024-01-02T00:00:00Z');
    await run(repositoryRoot, ['mv', original, renamed]);
    await commit(repositoryRoot, 'rename', '2024-01-03T00:00:00Z');
    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.modified.get('writing/new.md')).toBe('2024-01-02T00:00:00.000Z');
    expect(history.modified.has('writing/old.md')).toBe(false);
    expect(history.published.get('writing/new.md')).toBe('2024-01-01');
    await writeFile(renamed, '---\ntitle: Three\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'rename target edit', '2024-01-04T00:00:00Z');
    expect(
      (await collectContentHistory(repositoryRoot, 'HEAD')).modified.get('writing/new.md'),
    ).toBe('2024-01-04T00:00:00.000Z');
  });

  test('tracks course index, lesson changes, removals, and ignores assets', async () => {
    const repositoryRoot = await createRepository();
    const course = path.join(repositoryRoot, 'courses', 'demo');
    await mkdir(course, { recursive: true });
    await writeFile(
      path.join(course, 'README.md'),
      '---\ntitle: Demo\ndescription: D\ndate: 2024-01-01\n---\n\nCourse\n',
    );
    await writeFile(path.join(course, 'index.toml'), '[[lessons]]\nhref = "one.md"\n');
    await writeFile(path.join(course, 'one.md'), '---\ntitle: One\ndescription: D\n---\n\nOne\n');
    await writeFile(path.join(course, 'asset.png'), 'first');
    await commit(repositoryRoot, 'course', '2024-02-01T00:00:00Z');
    const initial = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(initial.courses.get('demo')).toBe('2024-02-01T00:00:00.000Z');
    await writeFile(path.join(course, 'asset.png'), 'second');
    await commit(repositoryRoot, 'asset only', '2024-02-02T00:00:00Z');
    expect((await collectContentHistory(repositoryRoot, 'HEAD')).courses.get('demo')).toBe(
      '2024-02-01T00:00:00.000Z',
    );
    await run(repositoryRoot, ['rm', path.join('courses', 'demo', 'one.md')]);
    await commit(repositoryRoot, 'remove lesson', '2024-02-03T00:00:00Z');
    expect((await collectContentHistory(repositoryRoot, 'HEAD')).courses.get('demo')).toBe(
      '2024-02-03T00:00:00.000Z',
    );
  });

  test('returns only the selected committed revision and excludes dirty or untracked files', async () => {
    const repositoryRoot = await createRepository();
    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    const file = path.join(repositoryRoot, 'writing', 'post.md');
    await writeFile(file, '---\ntitle: One\ndescription: D\ndate: 2024-01-01\n---\n\nOne\n');
    await commit(repositoryRoot, 'first', '2024-01-01T00:00:00Z');
    const firstRevision = (
      await new Response(
        Bun.spawn(['git', 'rev-parse', 'HEAD'], { cwd: repositoryRoot, stdout: 'pipe' }).stdout,
      ).text()
    ).trim();
    await writeFile(file, '---\ntitle: Two\ndescription: D\ndate: 2024-01-01\n---\n\nTwo\n');
    await writeFile(
      path.join(repositoryRoot, 'writing', 'untracked.md'),
      '---\ntitle: U\n---\n\nU\n',
    );
    const history = await collectContentHistory(repositoryRoot, firstRevision);
    expect(history.revision).toBe(firstRevision);
    expect(history.modified.get('writing/post.md')).toBe('2024-01-01T00:00:00.000Z');
    expect(history.published.has('writing/untracked.md')).toBe(false);
  });

  test('rejects a shallow clone', async () => {
    const source = await createRepository();
    await mkdir(path.join(source, 'writing'), { recursive: true });
    await writeFile(path.join(source, 'writing', 'post.md'), '---\ntitle: One\n---\n\nBody\n');
    await commit(source, 'first', '2024-01-01T00:00:00Z');
    const clone = await mkdtemp(path.join(os.tmpdir(), 'content-history-shallow-'));
    repositories.push(clone);
    await run(os.tmpdir(), ['clone', '--depth', '1', `file://${source}`, clone]);
    await expect(collectContentHistory(clone, 'HEAD')).rejects.toThrow(/shallow/i);
  });

  test('records a semantic change introduced by a merge commit', async () => {
    const repositoryRoot = await createRepository();
    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    const file = path.join(repositoryRoot, 'writing', 'merge.md');
    await writeFile(file, '---\ntitle: One\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'base', '2024-01-01T00:00:00Z');
    await run(repositoryRoot, ['checkout', '-qb', 'side']);
    await writeFile(file, '---\ntitle: Side\ndescription: A\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'side', '2024-01-02T00:00:00Z');
    await run(repositoryRoot, ['checkout', '-']);
    await writeFile(file, '---\ntitle: One\ndescription: Main\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'main', '2024-01-03T00:00:00Z');
    await run(repositoryRoot, ['merge', '--no-commit', '-X', 'ours', 'side']);
    await writeFile(file, '---\ntitle: Merged\ndescription: Main\ndate: 2024-01-01\n---\n\nBody\n');
    await commit(repositoryRoot, 'merge resolution', '2024-01-04T00:00:00Z');
    expect(
      (await collectContentHistory(repositoryRoot, 'HEAD')).modified.get('writing/merge.md'),
    ).toBe('2024-01-04T00:00:00.000Z');
  });
});
