import { afterEach, describe, expect, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';

import { normalizeContentMetadata } from './content-repository/metadata.ts';

const repositoryRoot = path.resolve(import.meta.dir, '../..');
const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (prefix: string): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
};

const writeFixture = async (root: string, file: string, source: string): Promise<void> => {
  const target = path.join(root, file);
  await Bun.write(target, source);
};

const runGit = (root: string, ...arguments_: string[]): string =>
  execFileSync('git', arguments_, { cwd: root, encoding: 'utf8' }).trim();

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('content authoring contracts', () => {
  test('keeps Obsidian templates enabled with the shared metadata types', async () => {
    const corePlugins = JSON.parse(
      await readFile(path.join(repositoryRoot, '.obsidian/core-plugins.json'), 'utf8'),
    ) as Record<string, boolean>;
    const types = JSON.parse(
      await readFile(path.join(repositoryRoot, '.obsidian/types.json'), 'utf8'),
    ) as { types: Record<string, string> };

    expect(corePlugins.templates).toBe(true);
    expect(types).toEqual({ types: { title: 'text', description: 'text', date: 'date' } });
  });

  test('uses authored date metadata only where the source schema requires it', async () => {
    const templates = {
      writing: await readFile(path.join(repositoryRoot, 'templates/Writing Post.md'), 'utf8'),
      course: await readFile(path.join(repositoryRoot, 'templates/Course Landing.md'), 'utf8'),
      lesson: await readFile(path.join(repositoryRoot, 'templates/Course Lesson.md'), 'utf8'),
    };
    const authoredDate = '2026-09-14';
    const fillAuthorInputs = (source: string): string =>
      source
        .replace(/^title:.*$/m, 'title: An authored title')
        .replace(/^description:.*$/m, 'description: An authored description.')
        .replace('{{date:YYYY-MM-DD}}', authoredDate);
    const writing = fillAuthorInputs(templates.writing);
    const course = fillAuthorInputs(templates.course);

    for (const [file, source] of Object.entries({
      'writing/post.md': writing,
      'courses/demo/README.md': course,
    })) {
      const result = normalizeContentMetadata(source, { file });
      expect(result.issues.filter((issue) => issue.severity !== 'warning')).toEqual([]);
      expect(result.metadata.date).toBe(authoredDate);
      expect(result.metadata.title).toBe('An authored title');
      expect(result.metadata.description).toBe('An authored description.');
    }

    const lesson = normalizeContentMetadata(templates.lesson, {
      file: 'courses/demo/lesson.md',
      titleCandidates: ['A lesson'],
    });
    expect(lesson.issues.some((issue) => issue.field === 'date')).toBe(false);
    expect(lesson.normalizedSource).not.toContain('modified:');
    expect(lesson.normalizedSource).not.toContain('published:');
    expect(lesson.normalizedSource).not.toContain('tags:');
  });

  test('accepts explicit template inputs and rejects derived or obsolete keys', async () => {
    const source = `---
title: A course
description: A course description.
date: 2026-09-14
---
`;
    const result = normalizeContentMetadata(source, { file: 'courses/demo/README.md' });
    expect(result.issues.filter((issue) => issue.severity !== 'warning')).toEqual([]);
    expect(result.metadata).toEqual({
      title: 'A course',
      description: 'A course description.',
      date: '2026-09-14',
    });

    const lesson = normalizeContentMetadata(
      `---
title: A lesson
description: A lesson description.
date: 2026-09-14
modified: 2026-09-14
---
`,
      { file: 'courses/demo/lesson.md' },
    );
    expect(lesson.issues.filter((issue) => !issue.fixable)).toEqual([]);
    expect(lesson.normalizedSource).not.toContain('date:');
    expect(lesson.normalizedSource).not.toContain('modified:');
  });
});

describe('Lefthook content metadata repair', () => {
  test('stages metadata repairs while keeping an unstaged body hunk unstaged', async () => {
    const root = await createTemporaryDirectory('content-hook-');
    runGit(root, 'init', '-q');
    runGit(root, 'config', 'user.email', 'test@example.com');
    runGit(root, 'config', 'user.name', 'Content Test');
    const file = 'courses/demo/README.md';
    const initial = `---
title: Demo
description: A demo course.
date: 2026-01-01
---

Original body line.
Keep this line.
Another stable line.
`;
    await writeFixture(root, file, initial);
    runGit(root, 'add', file);
    runGit(root, 'commit', '-qm', 'initial content');

    const stagedVersion = `---
title: Updated Demo
description: A demo course.
date: 2026-01-01
modified: 2026-01-02
---

Original body line.
Keep this line.
Another stable line.
`;
    await writeFixture(root, file, stagedVersion);
    runGit(root, 'add', file);
    const worktreeVersion = stagedVersion.replace(
      'Keep this line.\n',
      'Keep this line changed in the worktree.\n',
    );
    await writeFixture(root, file, worktreeVersion);
    expect(runGit(root, 'show', `:${file}`)).not.toContain('Keep this line changed');
    expect(await readFile(path.join(root, file), 'utf8')).toContain(
      'Keep this line changed in the worktree.',
    );

    const wrapper = path.join(root, 'run-content-metadata.ts');
    await writeFixture(
      root,
      'run-content-metadata.ts',
      `import { auditContentMetadata, reportMetadataIssues } from ${JSON.stringify(path.join(repositoryRoot, 'packages/scripts/content-metadata.ts'))};
const result = await auditContentMetadata({ root: process.cwd(), fix: true, paths: process.argv.slice(2).filter((value) => value !== '--fix') });
reportMetadataIssues(result.issues);
if (result.issues.some((issue) => issue.severity !== 'warning')) process.exit(1);
`,
    );
    await writeFixture(
      root,
      'lefthook.yml',
      `pre-commit:
  piped: true
  commands:
    content-metadata:
      glob: ['courses/**/*.md']
      run: bun ${wrapper} --fix {staged_files}
      stage_fixed: true
`,
    );
    const lefthook = path.join(repositoryRoot, 'node_modules/.bin/lefthook');
    execFileSync(lefthook, ['run', 'pre-commit', '--no-tty', '--no-auto-install'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CONTENT_GIT_REVISION: 'HEAD' },
    });

    const normalized = normalizeContentMetadata(stagedVersion, { file });
    expect(runGit(root, 'show', `:${file}`)).toBe(normalized.normalizedSource.trim());
    expect(await readFile(path.join(root, file), 'utf8')).toContain(
      'Keep this line changed in the worktree.',
    );
    expect(runGit(root, 'diff', '--', file)).toContain('Keep this line changed in the worktree.');
    expect(runGit(root, 'diff', '--cached', '--', file)).not.toContain(
      'Keep this line changed in the worktree.',
    );
    expect(parse((await readFile(path.join(root, file), 'utf8')).split('---')[1]).description).toBe(
      'A demo course.',
    );
  });
});
