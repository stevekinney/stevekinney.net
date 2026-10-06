import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { CourseContentsData } from '@stevekinney/utilities/content-types';

import type { ContentValidationIssue } from './types.ts';
import { isExperimentRoute, optionalStringArray, validateCourseContents } from './validation.ts';

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

  test('does not warn when an on-disk lesson is explicitly unlisted', () => {
    const contents: CourseContentsData = {
      section: [{ item: [{ title: 'Intro', href: 'intro.md' }] }],
      metadata: {
        unlisted: ['draft.md'],
      },
    };

    expect(collect(contents, ['intro', 'draft'])).toEqual([]);
  });

  test('reports an error when unlisted references a lesson missing from disk', () => {
    const contents: CourseContentsData = {
      section: [{ item: [{ title: 'Intro', href: 'intro.md' }] }],
      metadata: {
        unlisted: ['missing-draft.md'],
      },
    };

    const issues = collect(contents, ['intro']);

    expect(issues).toEqual([
      {
        file: 'courses/example/index.toml',
        message: "index.toml lists missing unlisted lesson 'missing-draft.md'.",
      },
    ]);
    expect(issues[0].severity).toBeUndefined();
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

describe('optionalStringArray', () => {
  test('treats an empty array as unset', () => {
    const issues: ContentValidationIssue[] = [];

    expect(optionalStringArray('projects/example.md', [], 'npmPackages', issues)).toBeUndefined();
    expect(issues).toEqual([]);
  });

  test('normalizes non-empty string arrays', () => {
    const issues: ContentValidationIssue[] = [];

    expect(
      optionalStringArray(
        'projects/example.md',
        [' package-one ', '@scope/package-two'],
        'npmPackages',
        issues,
      ),
    ).toEqual(['package-one', '@scope/package-two']);
    expect(issues).toEqual([]);
  });

  test('reports malformed package metadata', () => {
    const issues: ContentValidationIssue[] = [];

    expect(
      optionalStringArray('projects/example.md', ['package-one', ''], 'npmPackages', issues),
    ).toBeUndefined();
    expect(issues).toEqual([
      {
        file: 'projects/example.md',
        message: "Invalid 'npmPackages' frontmatter.",
      },
    ]);
  });
});

describe('isExperimentRoute', () => {
  const routesRoot = mkdtempSync(path.join(tmpdir(), 'experiment-routes-'));
  mkdirSync(path.join(routesRoot, 'experiments', 'model-calculator'), { recursive: true });
  writeFileSync(path.join(routesRoot, 'experiments', '+page.svelte'), '');
  writeFileSync(path.join(routesRoot, 'experiments', 'model-calculator', '+page.svelte'), '');

  test('accepts the index and an experiment whose route folder has a page', () => {
    expect(isExperimentRoute('/experiments', routesRoot)).toBe(true);
    expect(isExperimentRoute('/experiments/model-calculator', routesRoot)).toBe(true);
  });

  test('rejects an experiment that does not exist', () => {
    expect(isExperimentRoute('/experiments/loop-governor', routesRoot)).toBe(false);
  });

  test('rejects anything outside the experiments routes', () => {
    expect(isExperimentRoute('/writing/model-calculator', routesRoot)).toBe(false);
    expect(isExperimentRoute('/experiments/model-calculator/extra', routesRoot)).toBe(false);
    expect(isExperimentRoute('/experiments/../courses', routesRoot)).toBe(false);
  });
});
