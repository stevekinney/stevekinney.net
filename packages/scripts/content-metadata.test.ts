import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseFrontmatter } from '@stevekinney/utilities/frontmatter';

import { auditContentMetadata } from './content-metadata.ts';

const roots: string[] = [];
const history = {
  revision: 'test',
  modified: new Map<string, string>(),
  published: new Map<string, string>(),
  courses: new Map<string, string>(),
};

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'content-metadata-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), source);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('content metadata workflow', () => {
  test('checks without writes and repairs only requested content, idempotently', async () => {
    const source =
      '---\ntitle: A useful post\ndescription: A clear description of one useful post.\ndate: 2025-01-01\nmodified: 2025-02-01\n---\n\nBody stays unchanged.\n';
    const project =
      '---\nname: Project\ndescription: A project.\ngithubUrl: https://github.com/example/project\n---\n';
    const root = await fixture({ 'writing/post.md': source, 'projects/project.md': project });
    const checked = await auditContentMetadata({ root, history });
    expect(checked.issues.some((issue) => issue.fixable)).toBe(true);
    expect(await readFile(path.join(root, 'writing/post.md'), 'utf8')).toBe(source);
    const fixed = await auditContentMetadata({ root, history, fix: true });
    expect(fixed.changedFiles).toEqual(['writing/post.md']);
    expect(fixed.issues.filter((issue) => issue.severity !== 'warning')).toEqual([]);
    expect((await auditContentMetadata({ root, history, fix: true })).changedFiles).toEqual([]);
    expect(await readFile(path.join(root, 'projects/project.md'), 'utf8')).toBe(project);
  });

  test('uses course navigation as missing title evidence without changing its labels', async () => {
    const index = '[[section]]\n[[section.item]]\ntitle = "A lesson"\nhref = "lesson.md"\n';
    const root = await fixture({
      'courses/example/index.toml': index,
      'courses/example/lesson.md':
        '---\ndescription: Learn a specific technique in this lesson.\n---\n\nLesson body.\n',
    });
    const result = await auditContentMetadata({ root, history, fix: true });
    expect(result.issues.filter((issue) => issue.severity !== 'warning')).toEqual([]);
    expect(
      parseFrontmatter(await readFile(path.join(root, 'courses/example/lesson.md'), 'utf8')).data
        .title,
    ).toBe('A lesson');
    expect(await readFile(path.join(root, 'courses/example/index.toml'), 'utf8')).toBe(index);
  });

  test('checks duplicate descriptions against documents outside an explicit file selection', async () => {
    const source =
      '---\ntitle: A lesson\ndescription: Duplicate descriptions should require editorial attention.\n---\n';
    const root = await fixture({ 'courses/a/one.md': source, 'courses/b/two.md': source });
    const result = await auditContentMetadata({ root, history, paths: ['courses/a/one.md'] });
    expect(result.issues.some((issue) => issue.message.toLowerCase().includes('duplicate'))).toBe(
      true,
    );
  });

  test('rejects unsupported content locations and paths outside the corpus', async () => {
    const root = await fixture({ 'writing/nested/post.md': '# Not a routed source\n' });
    const result = await auditContentMetadata({ root, history });
    expect(result.issues.some((issue) => issue.file === 'writing/nested/post.md')).toBe(true);
    await expect(
      auditContentMetadata({ root, history, paths: ['../escape.md'], fix: true }),
    ).rejects.toThrow();
  });
});
