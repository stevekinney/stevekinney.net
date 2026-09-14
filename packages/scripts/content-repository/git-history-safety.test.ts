import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { collectContentHistory } from './git-history.ts';

const repositories: string[] = [];

const run = async (
  repositoryRoot: string,
  arguments_: string[],
  environment?: Record<string, string>,
): Promise<string> => {
  const process = Bun.spawn(['git', ...arguments_], {
    cwd: repositoryRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    env: environment,
  });
  const [output, error, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(error);
  return output.trim();
};

const commit = async (repositoryRoot: string, message: string, date: string): Promise<void> => {
  await run(repositoryRoot, ['add', '.']);
  await run(repositoryRoot, ['commit', '-qm', message], {
    ...process.env,
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  } as Record<string, string>);
};

const createRepository = async (): Promise<string> => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'git-history-safety-'));
  repositories.push(repositoryRoot);
  await run(repositoryRoot, ['init', '-q']);
  await run(repositoryRoot, ['config', 'user.email', 'tests@example.com']);
  await run(repositoryRoot, ['config', 'user.name', 'Tests']);
  return repositoryRoot;
};

const writePost = async (
  repositoryRoot: string,
  filePath: string,
  metadata: { title: string; description: string; date: string },
  body = 'Body',
): Promise<void> => {
  const absolutePath = path.join(repositoryRoot, filePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    `---\ntitle: ${metadata.title}\ndescription: ${metadata.description}\ndate: ${metadata.date}\n---\n\n${body}\n`,
  );
};

afterEach(async () => {
  await Promise.all(
    repositories.splice(0).map((repositoryRoot) => rm(repositoryRoot, { recursive: true })),
  );
});

describe('collectContentHistory safety', () => {
  test('does not replay discarded side-branch edits or unrelated main edits as merge changes', async () => {
    const repositoryRoot = await createRepository();
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'Base',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'base', '2024-01-01T00:00:00Z');

    await run(repositoryRoot, ['checkout', '-qb', 'side']);
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'Side',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'discarded side edit', '2024-01-02T00:00:00Z');

    await run(repositoryRoot, ['checkout', '-']);
    await writePost(repositoryRoot, 'writing/other.md', {
      title: 'Other',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'main unrelated post', '2024-01-03T00:00:00Z');

    await run(repositoryRoot, ['merge', '--no-commit', '-X', 'ours', 'side']);
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'Base',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'discard side branch at merge', '2024-01-04T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect({
      discardedBranchEdit: history.modified.get('writing/post.md'),
      unrelatedMainEdit: history.modified.get('writing/other.md'),
    }).toEqual({
      discardedBranchEdit: '2024-01-01T00:00:00.000Z',
      unrelatedMainEdit: '2024-01-03T00:00:00.000Z',
    });
  });

  test('preserves a side branch edit date when a merge accepts that semantic content', async () => {
    const repositoryRoot = await createRepository();
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'Base',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'base', '2024-01-01T00:00:00Z');

    await run(repositoryRoot, ['checkout', '-qb', 'side']);
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'Side',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'side semantic edit', '2024-01-02T00:00:00Z');

    await run(repositoryRoot, ['checkout', '-']);
    await writePost(repositoryRoot, 'writing/other.md', {
      title: 'Other',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'main unrelated post', '2024-01-03T00:00:00Z');

    await run(repositoryRoot, ['merge', '--no-commit', '-X', 'theirs', 'side']);
    await commit(repositoryRoot, 'accept side branch at merge', '2024-01-04T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.modified.get('writing/post.md')).toBe('2024-01-02T00:00:00.000Z');
    expect(history.modified.get('writing/other.md')).toBe('2024-01-03T00:00:00.000Z');
  });

  test('follows current content files back through legacy repository paths', async () => {
    const repositoryRoot = await createRepository();
    await writePost(
      repositoryRoot,
      'legacy/docs/post.md',
      { title: 'Legacy', description: 'Desc', date: '2024-08-06' },
      'Body',
    );
    await commit(repositoryRoot, 'add legacy post', '2024-08-06T00:00:00Z');

    await writePost(
      repositoryRoot,
      'legacy/docs/post.md',
      { title: 'Legacy Updated', description: 'Desc', date: '2024-08-06' },
      'Body',
    );
    await commit(repositoryRoot, 'edit legacy post', '2024-09-01T00:00:00Z');

    await mkdir(path.join(repositoryRoot, 'writing'), { recursive: true });
    await run(repositoryRoot, ['mv', 'legacy/docs/post.md', 'writing/post.md']);
    await writeFile(
      path.join(repositoryRoot, 'writing', 'post.md'),
      '---\ndescription: Desc\ntitle: Legacy Updated\ndate: 2024-08-06\n---\n\nBody\n',
    );
    await commit(repositoryRoot, 'move post into content root', '2026-03-06T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.published.get('writing/post.md')).toBe('2024-08-06');
    expect(history.modified.get('writing/post.md')).toBe('2024-09-01T00:00:00.000Z');
  });

  test('treats frontmatter whitespace-only cleanup the same way as metadata normalization', async () => {
    const repositoryRoot = await createRepository();
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'One',
      description: 'A useful description',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'add post', '2024-01-01T00:00:00Z');

    await writeFile(
      path.join(repositoryRoot, 'writing', 'post.md'),
      '---\ntitle: One\ndescription: A   useful\n  description\ndate: 2024-01-01\n---\n\nBody\n',
    );
    await commit(repositoryRoot, 'metadata whitespace cleanup', '2024-01-02T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.modified.get('writing/post.md')).toBe('2024-01-01T00:00:00.000Z');
  });

  test('resets publication when a file is deleted and later re-added at the same path', async () => {
    const repositoryRoot = await createRepository();
    await writePost(
      repositoryRoot,
      'writing/post.md',
      { title: 'Old', description: 'Desc', date: '2024-01-01' },
      'Old body',
    );
    await commit(repositoryRoot, 'add old post', '2024-01-01T00:00:00Z');

    await run(repositoryRoot, ['rm', 'writing/post.md']);
    await commit(repositoryRoot, 'delete old post', '2024-01-02T00:00:00Z');

    await writePost(
      repositoryRoot,
      'writing/post.md',
      { title: 'New', description: 'Desc', date: '2024-01-03' },
      'New body',
    );
    await commit(repositoryRoot, 're-add new post', '2024-01-03T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.published.get('writing/post.md')).toBe('2024-01-03');
    expect(history.modified.get('writing/post.md')).toBe('2024-01-03T00:00:00.000Z');
  });

  test('carries dates through a pure rename after metadata-only cleanup', async () => {
    const repositoryRoot = await createRepository();
    await writePost(repositoryRoot, 'writing/old.md', {
      title: 'One',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'add post', '2024-01-01T00:00:00Z');

    await writeFile(
      path.join(repositoryRoot, 'writing', 'old.md'),
      '---\ndescription: Desc\ntitle: One\ndate: 2024-01-01\nmodified: ignored\n---\n\nBody\n',
    );
    await commit(repositoryRoot, 'metadata-only cleanup', '2024-01-02T00:00:00Z');
    await run(repositoryRoot, ['mv', 'writing/old.md', 'writing/new.md']);
    await commit(repositoryRoot, 'rename post', '2024-01-03T00:00:00Z');

    const history = await collectContentHistory(repositoryRoot, 'HEAD');
    expect(history.modified.get('writing/new.md')).toBe('2024-01-01T00:00:00.000Z');
    expect(history.published.get('writing/new.md')).toBe('2024-01-01');
    expect(history.modified.has('writing/old.md')).toBe(false);
  });

  test('fails closed when a referenced blob cannot be read', async () => {
    const repositoryRoot = await createRepository();
    await writePost(repositoryRoot, 'writing/post.md', {
      title: 'One',
      description: 'Desc',
      date: '2024-01-01',
    });
    await commit(repositoryRoot, 'add post', '2024-01-01T00:00:00Z');

    const blob = await run(repositoryRoot, ['rev-parse', 'HEAD:writing/post.md']);
    await unlink(path.join(repositoryRoot, '.git', 'objects', blob.slice(0, 2), blob.slice(2)));

    await expect(collectContentHistory(repositoryRoot, 'HEAD')).rejects.toThrow(/cat-file|unable/i);
  });
});
