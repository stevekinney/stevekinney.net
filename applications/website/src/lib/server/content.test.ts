import { describe, expect, it } from 'vitest';

import {
  findCourseForLessonSlug,
  getCourseRoute,
  getLessonRoute,
  getPostIndex,
  getWritingRoute,
} from './content';

describe('generated content lookups', () => {
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
});
