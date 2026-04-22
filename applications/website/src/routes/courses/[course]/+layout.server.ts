import { error, redirect } from '@sveltejs/kit';

import { findCourseForLessonSlug, getCourseEntry } from '$lib/server/content';

import type { LayoutServerLoad } from './$types';

export const prerender = true;
export const csr = false;

export const load: LayoutServerLoad = async ({ params }) => {
  const rawCourse = params.course;
  const courseSlug = rawCourse.replace(/\.md$/i, '');
  const lessonSuffix = params.lesson ? `/${params.lesson}` : '';

  if (rawCourse !== courseSlug) {
    const course = getCourseEntry(courseSlug);
    if (course) {
      throw redirect(308, `/courses/${courseSlug}${lessonSuffix}`);
    }

    const matchedCourse = findCourseForLessonSlug(courseSlug);
    if (matchedCourse) {
      throw redirect(308, `/courses/${matchedCourse}/${courseSlug}${lessonSuffix}`);
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
