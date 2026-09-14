import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  course: {
    slug: 'testing',
    title: 'Testing',
    description: 'Learn testing.',
    date: '2024-01-01',
    modified: '2024-02-01T00:00:00.000Z',
    sourcePath: 'courses/testing/README.md',
    sourceHash: 'course-hash',
    path: '/courses/testing',
    contents: {
      section: [
        {
          title: 'Basics',
          item: [
            { title: 'Playground', href: 'https://play.tailwindcss.com/' },
            {
              title: 'The Basics',
              href: 'the-basics.md',
              related: [
                { title: 'Exercises', href: 'exercises.md' },
                { title: 'The Basics again', href: 'the-basics.md' },
                { title: 'External tool', href: 'https://example.com/tool?mode=full' },
              ],
            },
          ],
        },
      ],
    },
  },
  lessons: [
    {
      title: 'The Basics',
      description: 'Basics.',
      slug: 'the-basics',
      path: '/courses/testing/the-basics',
      courseSlug: 'testing',
      modified: undefined,
    },
    {
      title: 'Exercises',
      description: 'Exercises.',
      slug: 'exercises',
      path: '/courses/testing/exercises',
      courseSlug: 'testing',
      modified: undefined,
    },
    {
      title: 'Zed Lesson',
      description: 'Additional.',
      slug: 'zed-lesson',
      path: '/courses/testing/zed-lesson',
      courseSlug: 'testing',
      modified: '2024-03-01T00:00:00.000Z',
    },
  ],
}));

vi.mock('$lib/server/content', () => ({
  getGeneratedContent: () => ({ courses: [state.course], lessons: state.lessons }),
  getCourseEntry: (slug: string) => (slug === state.course.slug ? state.course : undefined),
  getLessonRoute: (courseSlug: string, lessonSlug: string) =>
    state.lessons.find((lesson) => lesson.courseSlug === courseSlug && lesson.slug === lessonSlug),
}));

vi.mock('$lib/server/load-raw-content', () => ({
  loadRawCourseReadme: async () => 'course-body',
  loadRawCourseLesson: async (_courseSlug: string, lessonSlug: string) => `${lessonSlug}-body`,
  loadRawWritingContent: async () => 'writing-body',
  loadRawProjectContent: async () => 'project-body',
}));

import { renderCourseExport, renderLessonExport, renderWritingExport } from './llms';
import { GET } from '../../routes/[...path]/llms.txt/+server';

describe('LLM content exports', () => {
  it('returns 404 for a missing lesson in an existing course', async () => {
    const event = { params: { path: 'courses/testing/missing-lesson' } } as Parameters<
      typeof GET
    >[0];
    await expect(GET(event)).rejects.toMatchObject({ status: 404 });
  });

  it('preserves index and related links before slug-sorted additional lessons', async () => {
    const output = await renderCourseExport(state.course);

    expect(output.indexOf('[The Basics]')).toBeLessThan(output.indexOf('[Exercises]'));
    expect(output.indexOf('[Playground]')).toBeLessThan(output.indexOf('[The Basics]'));
    expect(output.indexOf('[Exercises]')).toBeLessThan(output.indexOf('### Additional lessons'));
    expect(output).toContain('- [Zed Lesson](https://stevekinney.com/courses/testing/zed-lesson)');
    expect(output).toContain('  - [External tool](https://example.com/tool?mode=full)');
    expect(output).toContain('- [Playground](https://play.tailwindcss.com/)');
    expect(output).not.toContain('/courses/testing/example.com');
    expect(output.match(/exercises-body/g)?.length).toBe(1);
    expect(output.match(/zed-lesson-body/g)?.length).toBe(1);
    expect(output.match(/the-basics-body/g)?.length).toBe(1);
  });

  it('emits per-document metadata and parent course relationships', async () => {
    const lesson = await renderLessonExport('testing', 'zed-lesson');
    expect(lesson).toContain('# Zed Lesson');
    expect(lesson).toContain('Modified: 2024-03-01T00:00:00.000Z');
    expect(lesson).toContain('Course: Testing');
    expect(lesson).toContain('Course URL: https://stevekinney.com/courses/testing');
    expect(lesson).toContain('Canonical: https://stevekinney.com/courses/testing/zed-lesson');
    expect(lesson).toContain('Author: Steve Kinney');
    expect(lesson).toContain('Language: en-US');

    const writing = await renderWritingExport({
      title: 'Writing title',
      description: 'Writing description.',
      date: '2024-01-01',
      modified: '2024-02-01T00:00:00.000Z',
      slug: 'writing-title',
      sourcePath: 'writing/writing-title.md',
      sourceHash: 'writing-hash',
      path: '/writing/writing-title',
    });
    expect(writing).toContain('# Writing title');
    expect(writing).toContain('Date: 2024-01-01');
    expect(writing).toContain('Modified: 2024-02-01T00:00:00.000Z');
  });
});
