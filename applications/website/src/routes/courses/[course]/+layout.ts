import { loadCourseContentsMarkdown, loadCourseReadmeMarkdown } from '$lib/content-modules';
import type { CourseMetadata } from '$lib/schemas/courses';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import type { Component } from 'svelte';
import type { LayoutLoad } from './$types';

type CourseLayoutData = {
  course: CourseMetadata & { slug: string };
  contents?: Component;
};

export const load: LayoutLoad = async ({ params }): Promise<CourseLayoutData> => {
  const { course: courseId } = params;

  const { metadata } = CourseMarkdownSchema.parse(await loadCourseReadmeMarkdown(courseId));

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
