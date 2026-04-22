import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  findCourseForLessonSlug,
  getCourseRoute,
  getLessonRoute,
  getPostIndex,
  getPrerenderEntries,
  getWritingRoute,
} from './content';

describe('generated content lookups', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns generated writing metadata from the shared content artifact', () => {
    const route = getWritingRoute('setup-python');

    expect(route).toMatchObject({
      contentType: 'writing',
      slug: 'setup-python',
      sourcePath: 'writing/setup-python.md',
    });
  });

  it('returns generated course and lesson metadata', () => {
    const course = getCourseRoute('testing');
    const lesson = getLessonRoute('testing', 'the-basics');

    expect(course).toMatchObject({
      contentType: 'course',
      courseSlug: 'testing',
      sourcePath: 'courses/testing/README.md',
    });
    expect(lesson).toMatchObject({
      contentType: 'lesson',
      courseSlug: 'testing',
      lessonSlug: 'the-basics',
      sourcePath: 'courses/testing/the-basics.md',
    });
  });

  it('preserves the legacy lesson-slug redirect behavior only for unique lesson slugs', () => {
    expect(findCourseForLessonSlug('the-basics')).toBe('testing');
  });

  it('keeps the writing index sorted for listing pages and feeds', () => {
    const [first, second] = getPostIndex();

    expect(new Date(first.date).getTime()).toBeGreaterThanOrEqual(new Date(second.date).getTime());
  });

  it('includes canonical and legacy prerender entries for content detail routes', () => {
    const entries = getPrerenderEntries();

    expect(entries.writing).toContainEqual({ slug: 'setup-python' });
    expect(entries.writing).toContainEqual({ slug: 'setup-python.md' });

    expect(entries.courses).toContainEqual({ course: 'testing' });
    expect(entries.courses).toContainEqual({ course: 'testing.md' });
    expect(entries.courses).toContainEqual({ course: 'the-basics.md' });

    expect(entries.lessons).toContainEqual({ course: 'testing', lesson: 'the-basics' });
    expect(entries.lessons).toContainEqual({ course: 'testing', lesson: 'the-basics.md' });
  });

  it('omits legacy markdown prerender entries during Vercel builds', () => {
    vi.stubEnv('VERCEL', '1');

    const entries = getPrerenderEntries();

    expect(entries.writing).toContainEqual({ slug: 'setup-python' });
    expect(entries.writing).not.toContainEqual({ slug: 'setup-python.md' });

    expect(entries.courses).toContainEqual({ course: 'testing' });
    expect(entries.courses).not.toContainEqual({ course: 'testing.md' });
    expect(entries.courses).not.toContainEqual({ course: 'the-basics.md' });

    expect(entries.lessons).toContainEqual({ course: 'testing', lesson: 'the-basics' });
    expect(entries.lessons).not.toContainEqual({ course: 'testing', lesson: 'the-basics.md' });
  });
});
