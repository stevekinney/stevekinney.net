import { error, redirect } from '@sveltejs/kit';

import type { RepositoryPath } from '$lib/repository-path';
import { getCourseEntry, getLessonRoute, getPrerenderEntries } from '$lib/server/content';
import { renderLessonDocument } from '$lib/server/content-documents';

import type { PageServerLoad } from './$types';

export const prerender = true;
export const csr = false;

export const load: PageServerLoad = async ({ params }) => {
  const rawLesson = params.lesson;
  const lessonSlug = rawLesson.replace(/\.md$/i, '');

  if (rawLesson !== lessonSlug) {
    throw redirect(308, `/courses/${params.course}/${lessonSlug}`);
  }

  const course = getCourseEntry(params.course);
  const lesson = getLessonRoute(params.course, lessonSlug);

  if (!course || !lesson) {
    throw error(404, 'Lesson not found');
  }

  return {
    course,
    title: lesson.title,
    description: lesson.description,
    date: lesson.date,
    modified: lesson.modified,
    sourcePath: lesson.sourcePath as RepositoryPath,
    contentHtml: await renderLessonDocument(lesson.sourcePath),
  };
};

export function entries() {
  return getPrerenderEntries().lessons;
}
