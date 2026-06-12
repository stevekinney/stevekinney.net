import { describe, expect, test } from 'bun:test';

import type { CourseContentsData } from '@stevekinney/utilities/content-types';

import type { ContentValidationIssue } from './types.ts';
import { validateCourseContents } from './validation.ts';

const collect = (
  contents: CourseContentsData | undefined,
  lessonSlugs: Iterable<string>,
): ContentValidationIssue[] => {
  const issues: ContentValidationIssue[] = [];
  validateCourseContents('courses/example/index.toml', contents, new Set(lessonSlugs), issues);
  return issues;
};

describe('validateCourseContents', () => {
  test('reports an error when index.toml references a lesson missing from disk', () => {
    const contents: CourseContentsData = {
      section: [{ item: [{ title: 'Ghost', href: 'ghost.md' }] }],
    };

    const issues = collect(contents, []);

    expect(issues).toEqual([
      {
        file: 'courses/example/index.toml',
        message: "index.toml references missing lesson 'ghost.md'.",
      },
    ]);
    // Missing references are blocking errors, not warnings.
    expect(issues[0].severity).toBeUndefined();
  });

  test('warns about a lesson on disk that index.toml never references', () => {
    const contents: CourseContentsData = {
      section: [{ item: [{ title: 'Intro', href: 'intro.md' }] }],
    };

    const issues = collect(contents, ['intro', 'orphan']);

    expect(issues).toEqual([
      {
        file: 'courses/example/index.toml',
        message: "Lesson 'orphan.md' exists on disk but is not referenced in index.toml.",
        severity: 'warning',
      },
    ]);
  });

  test('does not warn when every lesson on disk is referenced', () => {
    const contents: CourseContentsData = {
      section: [
        { item: [{ title: 'Intro', href: 'intro.md' }] },
        { item: [{ title: 'Setup', href: 'setup.md' }] },
      ],
    };

    expect(collect(contents, ['intro', 'setup'])).toEqual([]);
  });

  test('warns about every on-disk lesson when index.toml is missing entirely', () => {
    const issues = collect(undefined, ['intro', 'setup']);

    expect(issues).toEqual([
      {
        file: 'courses/example/index.toml',
        message:
          "Lesson 'intro.md' exists on disk but index.toml is missing or unreadable, so nothing references it.",
        severity: 'warning',
      },
      {
        file: 'courses/example/index.toml',
        message:
          "Lesson 'setup.md' exists on disk but index.toml is missing or unreadable, so nothing references it.",
        severity: 'warning',
      },
    ]);
  });

  test('validates related links the same way as primary lesson references', () => {
    const contents: CourseContentsData = {
      section: [
        {
          item: [
            {
              title: 'Intro',
              href: 'intro.md',
              related: [{ title: 'Missing related', href: 'missing-related.md' }],
            },
          ],
        },
      ],
    };

    const issues = collect(contents, ['intro']);

    expect(issues).toContainEqual({
      file: 'courses/example/index.toml',
      message: "index.toml references missing related lesson 'missing-related.md'.",
    });
  });
});
