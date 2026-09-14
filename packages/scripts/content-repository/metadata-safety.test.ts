import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { auditContentMetadata } from '../content-metadata.ts';
import { normalizeContentMetadata } from './metadata.ts';

const roots: string[] = [];
const history = {
  revision: 'test',
  modified: new Map<string, string>(),
  published: new Map<string, string>(),
  courses: new Map<string, string>(),
};

const createFixture = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'metadata-safety-'));
  roots.push(root);
  for (const [file, source] of Object.entries(files)) {
    const absolutePath = path.join(root, file);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, source);
  }
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('metadata normalization safety', () => {
  test('normalizes folded and literal descriptions without consuming following fields or comments', () => {
    for (const marker of ['>', '|']) {
      const source = `---\ntitle: Post\ndescription: ${marker}\n  A   safe\n  description\ndate: 2024-01-01\n# keep this comment\n---\nBody\n`;
      const result = normalizeContentMetadata(source, { file: 'writing/post.md' });

      expect(result.issues.filter((issue) => !issue.fixable)).toEqual([]);
      expect(result.normalizedSource).toContain('description: "A safe description"\n');
      expect(result.normalizedSource).toContain('date: 2024-01-01\n# keep this comment');
      expect(result.normalizedSource).toContain('---\nBody\n');
    }
  });

  test('removes obsolete list and empty fields without deleting the fields that follow', () => {
    const withList = normalizeContentMetadata(
      '---\ntitle: Post\ntags:\n  - one\n  - two\ndescription: Keep me\ndate: 2024-01-01\n---\nBody\n',
      { file: 'writing/post.md' },
    );
    expect(withList.issues.filter((issue) => !issue.fixable)).toEqual([]);
    expect(withList.normalizedSource).not.toContain('tags:');
    expect(withList.normalizedSource).toContain('description: Keep me\n');
    expect(withList.normalizedSource).toContain('date: 2024-01-01\n');

    const withEmpty = normalizeContentMetadata(
      '---\ntitle: Post\nstatus:\ndescription: Keep me too\ndate: 2024-01-01\n---\nBody\n',
      { file: 'writing/post.md' },
    );
    expect(withEmpty.issues.filter((issue) => !issue.fixable)).toEqual([]);
    expect(withEmpty.normalizedSource).not.toContain('status:');
    expect(withEmpty.normalizedSource).toContain('description: Keep me too\n');
    expect(withEmpty.normalizedSource).toContain('date: 2024-01-01\n');
  });

  test('quotes recovered titles that would otherwise be parsed as YAML syntax or booleans', () => {
    const yamlBoolean = normalizeContentMetadata(
      '---\ndescription: Desc\ndate: 2024-01-01\n---\n# true\n',
      { file: 'writing/post.md' },
    );
    expect(yamlBoolean.issues.filter((issue) => !issue.fixable)).toEqual([]);
    expect(yamlBoolean.normalizedSource).toContain('title: "true"\n');
    expect(
      normalizeContentMetadata(yamlBoolean.normalizedSource, { file: 'writing/post.md' }).issues,
    ).not.toContainEqual(expect.objectContaining({ field: 'title', fixable: false }));

    const punctuation = normalizeContentMetadata(
      '---\ndescription: Desc\ndate: 2024-01-01\n---\n# TypeScript: The Good Parts #1\n',
      { file: 'writing/post.md' },
    );
    expect(punctuation.normalizedSource).toContain('title: "TypeScript: The Good Parts #1"\n');
  });

  test('does not heal a document without frontmatter when required description is absent', () => {
    const result = normalizeContentMetadata('# Title\n\nPublished on 2024-01-01.\n', {
      file: 'writing/post.md',
      publicationDate: '2024-01-01',
    });

    expect(result.normalizedSource).toBe('# Title\n\nPublished on 2024-01-01.\n');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('frontmatter') }),
    );
  });

  test('rejects malformed frontmatter roots before recovering missing fields', () => {
    for (const source of ['---\njust text\n---\n# Title\n', '---\n- title: Post\n---\n# Title\n']) {
      const result = normalizeContentMetadata(source, { file: 'writing/post.md' });

      expect(result.normalizedSource).toBe(source);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ message: expect.stringMatching(/mapping|map|object/i) }),
      );
      expect(result.issues).not.toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Recovered') }),
      );
    }

    const complexKey = normalizeContentMetadata(
      '---\n? [a, b]\n: value\ndescription: Desc\ndate: 2024-01-01\n---\n# Title\n',
      { file: 'writing/post.md' },
    );
    expect(complexKey.normalizedSource).toContain('? [a, b]');
    expect(complexKey.issues).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('keys must be strings') }),
    );
  });

  test('rejects impossible calendar dates in zoned timestamps without UTC rollover', () => {
    const result = normalizeContentMetadata(
      '---\ntitle: Post\ndescription: Desc\ndate: 2024-02-31T23:30:00-02:00\n---\nBody\n',
      { file: 'writing/post.md' },
    );

    expect(result.normalizedSource).toContain('2024-02-31T23:30:00-02:00');
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        field: 'date',
        message: expect.stringContaining('Invalid'),
      }),
    );
  });

  test('rejects authored null and non-string metadata values instead of replacing them', () => {
    const nullTitle = normalizeContentMetadata(
      '---\ntitle: null\ndescription: Desc\ndate: 2024-01-01\n---\n# Recovered title\n',
      { file: 'writing/post.md' },
    );
    expect(nullTitle.normalizedSource).toContain('title: null');
    expect(nullTitle.issues).toContainEqual(
      expect.objectContaining({ field: 'title', message: expect.stringContaining('string') }),
    );
    expect(nullTitle.issues).not.toContainEqual(
      expect.objectContaining({ message: expect.stringContaining('Recovered') }),
    );

    const booleanTitle = normalizeContentMetadata(
      '---\ntitle: true\ndescription: Desc\ndate: 2024-01-01\n---\nBody\n',
      { file: 'writing/post.md' },
    );
    expect(booleanTitle.normalizedSource).toContain('title: true');
    expect(booleanTitle.issues).toContainEqual(
      expect.objectContaining({ field: 'title', message: expect.stringContaining('string') }),
    );
  });

  test('enforces the 160 code point description boundary', () => {
    const validDescription = 'a'.repeat(160);
    const valid = normalizeContentMetadata(
      `---\ntitle: Post\ndescription: ${validDescription}\ndate: 2024-01-01\n---\nBody\n`,
      { file: 'writing/post.md' },
    );
    expect(valid.issues).not.toContainEqual(
      expect.objectContaining({ field: 'description', message: expect.stringContaining('160') }),
    );

    const invalidDescription = `${'a'.repeat(160)}b`;
    const invalid = normalizeContentMetadata(
      `---\ntitle: Post\ndescription: ${invalidDescription}\ndate: 2024-01-01\n---\nBody\n`,
      { file: 'writing/post.md' },
    );
    expect(invalid.issues).toContainEqual(
      expect.objectContaining({ field: 'description', message: expect.stringContaining('160') }),
    );
  });

  test('checks duplicate descriptions across the repository while reporting every selected duplicate', async () => {
    const duplicate =
      '---\ntitle: One\ndescription: Reused description across selected documents.\ndate: 2024-01-01\n---\n';
    const root = await createFixture({
      'writing/one.md': duplicate,
      'writing/two.md': duplicate.replace('title: One', 'title: Two'),
      'writing/three.md': duplicate.replace('title: One', 'title: Three'),
      'projects/project.md': '---\ntitle: Project\ndescription: Untouched.\n---\n',
    });

    const result = await auditContentMetadata({
      root,
      history,
      paths: ['writing/one.md', 'writing/two.md'],
      fix: true,
    });

    const duplicateFiles = result.issues
      .filter((issue) => issue.message.includes('Duplicate description'))
      .map((issue) => issue.file)
      .sort();
    expect(duplicateFiles).toEqual(['writing/one.md', 'writing/two.md']);
    expect(await readFile(path.join(root, 'projects/project.md'), 'utf8')).toBe(
      '---\ntitle: Project\ndescription: Untouched.\n---\n',
    );
  });
});
