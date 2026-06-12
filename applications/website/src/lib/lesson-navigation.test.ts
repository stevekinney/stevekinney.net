import type { CourseContentsData } from '@stevekinney/utilities/content-types';
import { describe, expect, test } from 'vitest';

import { collectLessonItems, getLessonNavigation } from './lesson-navigation';

const contents: CourseContentsData = {
  section: [
    {
      title: 'Getting Started',
      item: [
        { title: 'Intro', href: 'intro.md' },
        { title: 'Setup', href: 'setup.md' },
      ],
    },
    {
      title: 'Going Deeper',
      item: [
        { title: 'External Resource', href: 'https://example.com/guide' },
        { title: 'Advanced', href: 'advanced.md' },
      ],
    },
  ],
};

describe('collectLessonItems', () => {
  test('flattens sections into ordered internal lessons and drops external links', () => {
    expect(collectLessonItems(contents)).toEqual([
      { title: 'Intro', slug: 'intro' },
      { title: 'Setup', slug: 'setup' },
      { title: 'Advanced', slug: 'advanced' },
    ]);
  });

  test('returns an empty list when contents is undefined', () => {
    expect(collectLessonItems(undefined)).toEqual([]);
  });

  test('drops items with a missing href without throwing', () => {
    const malformed = {
      section: [{ item: [{ title: 'No href' }, { title: 'Real', href: 'real.md' }] }],
    } as unknown as CourseContentsData;

    expect(collectLessonItems(malformed)).toEqual([{ title: 'Real', slug: 'real' }]);
  });

  test('ignores non-markdown internal hrefs', () => {
    const withAsset = {
      section: [{ item: [{ title: 'Asset', href: 'diagram.png' }] }],
    } as CourseContentsData;

    expect(collectLessonItems(withAsset)).toEqual([]);
  });

  test('matches the .md extension case-insensitively, like the slug strip', () => {
    const mixedCase = {
      section: [{ item: [{ title: 'Shouting', href: 'Intro.MD' }] }],
    } as CourseContentsData;

    expect(collectLessonItems(mixedCase)).toEqual([{ title: 'Shouting', slug: 'Intro' }]);
  });
});

describe('getLessonNavigation', () => {
  test('the first lesson has a next but no previous', () => {
    expect(getLessonNavigation(contents, 'intro')).toEqual({
      previous: null,
      next: { title: 'Setup', slug: 'setup' },
    });
  });

  test('a middle lesson has both previous and next', () => {
    expect(getLessonNavigation(contents, 'setup')).toEqual({
      previous: { title: 'Intro', slug: 'intro' },
      next: { title: 'Advanced', slug: 'advanced' },
    });
  });

  test('the last lesson has a previous but no next', () => {
    expect(getLessonNavigation(contents, 'advanced')).toEqual({
      previous: { title: 'Setup', slug: 'setup' },
      next: null,
    });
  });

  test('an unknown lesson slug yields no navigation', () => {
    expect(getLessonNavigation(contents, 'does-not-exist')).toEqual({
      previous: null,
      next: null,
    });
  });

  test('a single-lesson course has neither previous nor next', () => {
    const single: CourseContentsData = {
      section: [{ item: [{ title: 'Only', href: 'only.md' }] }],
    };

    expect(getLessonNavigation(single, 'only')).toEqual({ previous: null, next: null });
  });

  test('a course with no contents yields no navigation', () => {
    expect(getLessonNavigation(undefined, 'anything')).toEqual({ previous: null, next: null });
  });

  test('an undefined current slug yields no navigation', () => {
    expect(getLessonNavigation(contents, undefined)).toEqual({ previous: null, next: null });
  });

  test('skips external links when computing neighbors', () => {
    // 'setup' is followed by an external link then 'advanced'; the external link
    // must be skipped so 'advanced' is the next lesson.
    expect(getLessonNavigation(contents, 'setup').next).toEqual({
      title: 'Advanced',
      slug: 'advanced',
    });
  });
});
