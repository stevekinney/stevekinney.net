import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import { coursesRoot, writingRoot } from './content-paths.ts';
import { collectContentRepository } from './content-repository.ts';

const createTemporaryName = (prefix: string): string => `${prefix}-${randomUUID()}`;

const writeTextFile = async (filePath: string, contents: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
};

describe('collectContentRepository', () => {
  test('validates the current repository content graph', async () => {
    const repository = await collectContentRepository();
    expect(repository.validationIssues).toEqual([]);
    expect(repository.meta.routeCount).toBeGreaterThan(800);
    expect(repository.meta.sourceFileCount).toBeGreaterThan(800);
  });

  test('builds a route map for writing, course, and lesson content', async () => {
    const repository = await collectContentRepository();
    expect(repository.routes['/writing/setup-python']).toMatchObject({
      contentType: 'writing',
      slug: 'setup-python',
      sourcePath: 'writing/setup-python.md',
    });

    expect(repository.routes['/courses/testing']).toMatchObject({
      contentType: 'course',
      courseSlug: 'testing',
      sourcePath: 'courses/testing/README.md',
    });

    expect(repository.routes['/courses/testing/the-basics']).toMatchObject({
      contentType: 'lesson',
      courseSlug: 'testing',
      lessonSlug: 'the-basics',
      sourcePath: 'courses/testing/the-basics.md',
    });
  });

  test('produces deterministic metadata for content routes', async () => {
    const repository = await collectContentRepository();
    const route = repository.routes['/writing/setup-python'];

    expect(route.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(route.llmsPath).toBe('/writing/setup-python/llms.txt');
    expect(route.openGraphPath).toBe('/writing/setup-python/open-graph.jpg');
  });

  test('includes canonical and legacy prerender entries for long-form content routes', async () => {
    const repository = await collectContentRepository();

    expect(repository.prerenderEntries.writing).toContainEqual({ slug: 'setup-python' });
    expect(repository.prerenderEntries.writing).toContainEqual({ slug: 'setup-python.md' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'testing' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'testing.md' });
    expect(repository.prerenderEntries.courses).toContainEqual({ course: 'the-basics.md' });
    expect(repository.prerenderEntries.lessons).toContainEqual({
      course: 'testing',
      lesson: 'the-basics',
    });
    expect(repository.prerenderEntries.lessons).toContainEqual({
      course: 'testing',
      lesson: 'the-basics.md',
    });
  });

  test('extracts sanitized Tailwind playground source', async () => {
    const repository = await collectContentRepository();
    expect(repository.tailwindPlaygroundSource).toContain('bg-blue-600');
    expect(repository.tailwindPlaygroundSource).toContain('rounded-md');
    expect(repository.tailwindPlaygroundSource).not.toContain('<script');
  });

  test('reports missing course readmes, reserved slugs, broken links, and bad course contents', async () => {
    const courseWithoutReadme = path.join(
      coursesRoot,
      createTemporaryName('zz-content-missing-readme'),
    );
    const courseWithBadContents = path.join(
      coursesRoot,
      createTemporaryName('zz-content-bad-index'),
    );
    const reservedWritingPath = path.join(writingRoot, 'page.md');
    const brokenLinkWritingPath = path.join(
      writingRoot,
      `${createTemporaryName('zz-content-broken-link')}.md`,
    );

    await mkdir(courseWithoutReadme, { recursive: true });
    await mkdir(courseWithBadContents, { recursive: true });

    try {
      await writeTextFile(
        path.join(courseWithBadContents, 'README.md'),
        `---\ntitle: Temporary Test Course\ndescription: Temporary test course.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\nTemporary course body.\n`,
      );
      await writeTextFile(
        path.join(courseWithBadContents, 'index.toml'),
        `[[section]]\ntitle = "Broken"\n\n[[section.item]]\ntitle = "Missing lesson"\nhref = "missing-lesson.md"\n`,
      );
      await writeTextFile(
        reservedWritingPath,
        `---\ntitle: Temporary Reserved Route\ndescription: Triggers a reserved route collision.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\nTemporary content.\n`,
      );
      await writeTextFile(
        brokenLinkWritingPath,
        `---\ntitle: Temporary Broken Link\ndescription: Triggers broken link validation issues.\ndate: 2025-01-01\nmodified: 2025-01-01\n---\n\n## Temporary Heading\n\n[Missing asset](/zz-temporary-missing-asset-${randomUUID()}.png)\n[Missing section](#does-not-exist)\n`,
      );

      const repository = await collectContentRepository();
      const issues = repository.validationIssues.map((issue) => `${issue.file}: ${issue.message}`);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing course README.md.'),
          expect.stringContaining("index.toml references missing lesson 'missing-lesson.md'."),
          expect.stringContaining("Writing slug 'page' collides with a reserved route."),
          expect.stringContaining('Missing static asset for link'),
          expect.stringContaining("Unknown heading anchor '#does-not-exist'."),
        ]),
      );
    } finally {
      await rm(courseWithoutReadme, { recursive: true, force: true });
      await rm(courseWithBadContents, { recursive: true, force: true });
      await rm(reservedWritingPath, { force: true });
      await rm(brokenLinkWritingPath, { force: true });
    }
  });
});
