import { describe, expect, test } from 'bun:test';

import { classifyContentSource } from '@stevekinney/utilities/frontmatter';

import { normalizeContentMetadata, validateDuplicateDescriptions } from './metadata.ts';

describe('classifyContentSource', () => {
  test('classifies supported source paths', () => {
    expect(classifyContentSource('writing/post.md')).toBe('writing');
    expect(classifyContentSource('courses/typescript/README.md')).toBe('course');
    expect(classifyContentSource('courses/typescript/types.md')).toBe('lesson');
    expect(classifyContentSource('projects/example.md')).toBeNull();
  });
});

describe('normalizeContentMetadata', () => {
  test('returns structured errors for missing, malformed, and duplicate frontmatter', () => {
    const missing = normalizeContentMetadata('# Body', { file: 'writing/post.md' });
    expect(missing.normalizedSource).toBe('# Body');
    expect(missing.issues[0]?.message).toContain('frontmatter');
    const malformed = normalizeContentMetadata('---\ntitle: [oops\n---\nBody', {
      file: 'writing/post.md',
    });
    expect(malformed.normalizedSource).toContain('title: [oops');
    const duplicate = normalizeContentMetadata('---\ntitle: one\ntitle: two\n---\nBody', {
      file: 'writing/post.md',
    });
    expect(duplicate.issues.length).toBeGreaterThan(0);
    expect(duplicate.normalizedSource).toContain('title: one');
  });

  test('preserves body bytes and normalizes whitespace and zoned dates', () => {
    const source =
      '---\r\ntitle: "  Hello   world "\r\ndescription: >\r\n  A useful description\r\ndate: 2024-02-29T23:30:00-02:00\r\n# untouched comment\r\n---\r\nBody\r\n';
    const result = normalizeContentMetadata(source, { file: 'writing/post.md' });
    expect(result.metadata).toEqual({
      title: 'Hello world',
      description: 'A useful description',
      date: '2024-03-01',
    });
    expect(result.normalizedSource.endsWith('---\r\nBody\r\n')).toBe(true);
    expect(result.normalizedSource).toContain('# untouched comment');
  });

  test('rejects invalid dates and unknown fields without changing source', () => {
    const source = '---\ndescription: desc\ndate: 2023-02-29\nextra: true\n---\nBody';
    const result = normalizeContentMetadata(source, { file: 'writing/post.md' });
    expect(result.normalizedSource).toBe(source);
    expect(result.issues.map(({ field }) => field)).toEqual(expect.arrayContaining(['extra']));
  });

  test('uses exactly one leading top-level heading and ignores code blocks', () => {
    const source =
      '---\ndescription: desc\ndate: 2024-01-01\n---\n# Real title\n```md\n# Fake\n```\n';
    const result = normalizeContentMetadata(source, { file: 'writing/post.md' });
    expect(result.metadata.title).toBe('Real title');
    expect(result.normalizedSource).toContain('title: "Real title"');
  });

  test('fills blank metadata fields without introducing duplicate YAML keys', () => {
    const source = '---\r\ntitle:\r\ndescription: desc\r\ndate:\r\n---\r\n# Heading\r\n';
    const result = normalizeContentMetadata(source, {
      file: 'writing/post.md',
      publicationDate: '2024-01-02',
    });
    expect(result.normalizedSource.match(/^title:/gmu)).toHaveLength(1);
    expect(result.normalizedSource.match(/^date:/gmu)).toHaveLength(1);
    expect(result.normalizedSource).toContain('title: Heading\r\n');
    expect(result.normalizedSource).toContain('date: 2024-01-02\r\n');
  });

  test('reports conflicting title evidence and duplicate descriptions', () => {
    const result = normalizeContentMetadata(
      '---\ndescription: desc\ndate: 2024-01-01\n---\n# Heading',
      {
        file: 'writing/post.md',
        titleCandidates: ['Index title'],
      },
    );
    expect(result.issues.some(({ field }) => field === 'title')).toBe(true);
    expect(
      validateDuplicateDescriptions([
        { file: 'writing/a.md', description: 'Same   text' },
        { file: 'writing/b.md', description: ' same text ' },
      ]),
    ).toHaveLength(2);
  });

  test('removes obsolete lesson date and backfills publication date', () => {
    const source = '---\ntitle: Lesson\ndescription: Desc\ndate: 2024-01-01\n---\nBody';
    const result = normalizeContentMetadata(source, {
      file: 'courses/demo/lesson.md',
      publicationDate: '2024-03-04',
    });
    expect(result.metadata.date).toBeUndefined();
    expect(result.normalizedSource).not.toContain('date:');
  });

  test('is idempotent and preserves Unicode length semantics', () => {
    const source =
      '---\ntitle: Café 😀\ndescription: A short description\ndate: 2024-01-01\n---\nBody';
    const first = normalizeContentMetadata(source, { file: 'writing/post.md' });
    const second = normalizeContentMetadata(first.normalizedSource, { file: 'writing/post.md' });
    expect(second.normalizedSource).toBe(first.normalizedSource);
    expect(second.metadata.title).toBe('Café 😀');
  });

  test('allows plain identifiers and rejects parsed Markdown markup in descriptions', () => {
    const plain = normalizeContentMetadata(
      '---\ntitle: Post\ndescription: VITE_ENV has-* data-* not-* in-*\ndate: 2024-01-01\n---\nBody',
      { file: 'writing/post.md' },
    );
    expect(plain.issues.some(({ message }) => message.includes('markup'))).toBe(false);
    for (const description of [
      'Use `code`',
      '**bold** text',
      '[link](https://example.com)',
      '<em>HTML</em>',
    ]) {
      const result = normalizeContentMetadata(
        `---\ntitle: Post\ndescription: ${JSON.stringify(description)}\ndate: 2024-01-01\n---\nBody`,
        { file: 'writing/post.md' },
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'description',
          message: expect.stringContaining('markup'),
        }),
      );
    }
  });

  test('uses Unicode code points for description limits and trims authored dates', () => {
    const valid = normalizeContentMetadata(
      `---\ntitle: Post\ndescription: ${'😀'.repeat(160)}\ndate:   2024-01-01   \n---\nBody`,
      { file: 'writing/post.md' },
    );
    expect(
      valid.issues.some(({ field, message }) => field === 'description' && message.includes('160')),
    ).toBe(false);
    expect(valid.metadata.date).toBe('2024-01-01');
    const invalid = normalizeContentMetadata(
      `---\ntitle: Post\ndescription: ${'😀'.repeat(161)}\ndate: 2024-01-01\n---\nBody`,
      { file: 'writing/post.md' },
    );
    expect(invalid.issues).toContainEqual(
      expect.objectContaining({ field: 'description', message: expect.stringContaining('160') }),
    );
  });

  test('rejects explicit YAML null variants while recovering blank template scalars', () => {
    for (const value of ['null', 'Null', 'NULL', '~']) {
      const result = normalizeContentMetadata(
        `---\ntitle: ${value}\ndescription: Desc\ndate: 2024-01-01\n---\n# Heading`,
        { file: 'writing/post.md' },
      );
      expect(result.issues).toContainEqual(
        expect.objectContaining({ field: 'title', message: expect.stringContaining('string') }),
      );
      expect(result.issues.some(({ message }) => message.includes('Recovered'))).toBe(false);
    }
    const blank = normalizeContentMetadata(
      '---\ntitle:\ndescription: Desc\ndate: 2024-01-01\n---\n# Heading',
      { file: 'writing/post.md' },
    );
    expect(blank.metadata.title).toBe('Heading');
  });

  test('fails closed for flow-style obsolete fields', () => {
    const source =
      '---\n{title: Post, tags: [one], description: Keep, date: 2024-01-01}\n---\nBody';
    const result = normalizeContentMetadata(source, { file: 'writing/post.md' });
    expect(result.normalizedSource).toBe(source);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ field: 'tags', message: expect.stringContaining('flow-style') }),
    );
  });
});
