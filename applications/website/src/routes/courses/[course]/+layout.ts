import {
  findCourseForLessonSlug,
  hasCourseReadmeMarkdown,
  loadCourseContentsMarkdown,
  loadCourseReadmeMarkdown,
  MarkdownModuleNotFoundError,
} from '$lib/content-modules';
import type { CourseMetadata } from '$lib/schemas/courses';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import { error, redirect } from '@sveltejs/kit';
import type { Component } from 'svelte';
import type { LayoutLoad } from './$types';

type CourseLayoutData = {
  course: CourseMetadata & { slug: string };
  contents?: Component;
};

export const load: LayoutLoad = async ({ params }): Promise<CourseLayoutData> => {
  const { course: rawCourseId } = params;
  const courseId = rawCourseId.replace(/\.md$/i, '');

  if (rawCourseId !== courseId) {
    if (hasCourseReadmeMarkdown(courseId)) {
      throw redirect(308, `/courses/${courseId}`);
    }

    const matchedCourse = findCourseForLessonSlug(courseId);
    if (matchedCourse) {
      throw redirect(308, `/courses/${matchedCourse}/${courseId}`);
    }
  }

  let metadata: CourseMetadata;
  try {
    ({ metadata } = CourseMarkdownSchema.parse(await loadCourseReadmeMarkdown(courseId)));
  } catch (caught) {
    if (caught instanceof MarkdownModuleNotFoundError) {
      throw error(404, 'Course not found');
    }
    throw caught;
  }

  const course = {
    ...metadata,
    slug: courseId,
  };

  const contentsModule = await loadCourseContentsMarkdown(courseId);
  if (contentsModule) {
    return {
      contents: contentsModule.default,
      course,
    };
  }

  return {
    course,
  };
};
