// import { error } from '@sveltejs/kit';
import { loadCourseReadmeMarkdown } from '$lib/content-modules';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course: slug } = params;

  const { default: content, metadata } = CourseMarkdownSchema.parse(
    await loadCourseReadmeMarkdown(slug),
  );

  return {
    ...metadata,
    content,
  };
};
