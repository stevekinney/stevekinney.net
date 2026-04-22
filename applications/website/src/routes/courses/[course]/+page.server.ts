import { error } from '@sveltejs/kit';

import type { RepoPath } from '$lib/repo-path';
import { getPrerenderEntries, getCourseRoute } from '$lib/server/content';
import { renderCourseDocument } from '$lib/server/content-documents';

import type { PageServerLoad } from './$types';

export const prerender = true;
export const csr = false;

export const load: PageServerLoad = async ({ params }) => {
  const courseSlug = params.course.replace(/\.md$/i, '');
  const course = getCourseRoute(courseSlug);
  if (!course) {
    throw error(404, 'Course not found');
  }

  return {
    title: course.title,
    description: course.description,
    date: course.date,
    modified: course.modified,
    sourcePath: course.sourcePath as RepoPath,
    contentHtml: await renderCourseDocument(course.sourcePath),
  };
};

export function entries() {
  return getPrerenderEntries().courses;
}
