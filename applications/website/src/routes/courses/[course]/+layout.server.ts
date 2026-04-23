import { error, redirect } from '@sveltejs/kit';

import { findCourseForLessonSlug, getCourseEntry } from '$lib/server/content';

import type { LayoutServerLoad } from './$types';

export const prerender = true;
export const csr = false;

const getCoursePathSuffix = (pathname: string, rawCourse: string): string => {
  const coursePathPrefix = `/courses/${rawCourse}`;
  if (!pathname.startsWith(coursePathPrefix)) return '';

  const suffix = pathname.slice(coursePathPrefix.length);
  return suffix.startsWith('/') ? suffix : '';
};

export const load: LayoutServerLoad = async ({ params, url }) => {
  const rawCourse = params.course;
  const courseSlug = rawCourse.replace(/\.md$/i, '');

  if (rawCourse !== courseSlug) {
    const course = getCourseEntry(courseSlug);
    if (course) {
      throw redirect(308, `/courses/${courseSlug}${getCoursePathSuffix(url.pathname, rawCourse)}`);
    }

    const matchedCourse = findCourseForLessonSlug(courseSlug);
    if (matchedCourse) {
      throw redirect(308, `/courses/${matchedCourse}/${courseSlug}`);
    }
  }

  const course = getCourseEntry(courseSlug);
  if (!course) {
    throw error(404, 'Course not found');
  }

  return {
    course,
    contents: course.contents,
  };
};
