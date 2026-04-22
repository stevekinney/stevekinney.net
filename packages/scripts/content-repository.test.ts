import { describe, expect, test } from 'bun:test';

import { collectContentRepository } from './content-repository.ts';

const repositoryPromise = collectContentRepository();

describe('collectContentRepository', () => {
  test('validates the current repository content graph', async () => {
    const repository = await repositoryPromise;
    expect(repository.validationIssues).toEqual([]);
    expect(repository.meta.routeCount).toBeGreaterThan(800);
    expect(repository.meta.sourceFileCount).toBeGreaterThan(800);
  });

  test('builds a route map for writing, course, and lesson content', async () => {
    const repository = await repositoryPromise;
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
    const repository = await repositoryPromise;
    const route = repository.routes['/writing/setup-python'];

    expect(route.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(route.llmsPath).toBe('/writing/setup-python/llms.txt');
    expect(route.openGraphPath).toBe('/writing/setup-python/open-graph.jpg');
  });

  test('extracts sanitized Tailwind playground source', async () => {
    const repository = await repositoryPromise;
    expect(repository.tailwindPlaygroundSource).toContain('bg-blue-600');
    expect(repository.tailwindPlaygroundSource).toContain('rounded-md');
    expect(repository.tailwindPlaygroundSource).not.toContain('<script');
  });
});
