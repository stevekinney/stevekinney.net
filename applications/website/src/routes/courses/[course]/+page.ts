import { loadCourseReadmeMarkdown, MarkdownModuleNotFoundError } from '$lib/content-modules';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course: rawSlug } = params;
  const slug = rawSlug.replace(/\.md$/i, '');

  let parsedCourse: ReturnType<typeof CourseMarkdownSchema.parse>;
  try {
    parsedCourse = CourseMarkdownSchema.parse(await loadCourseReadmeMarkdown(slug));
  } catch (caught) {
    if (caught instanceof MarkdownModuleNotFoundError) {
      throw error(404, 'Course not found');
    }
    throw caught;
  }
  const { default: content, metadata } = parsedCourse;

  return {
    ...metadata,
    content,
  };
};
