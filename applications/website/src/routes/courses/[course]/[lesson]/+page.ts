import { loadCourseLessonMarkdown } from '$lib/content-modules';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course, lesson } = params;

  const { default: content, metadata } = CourseMarkdownSchema.parse(
    await loadCourseLessonMarkdown(course, lesson),
  );

  return {
    content,
    ...metadata,
  };
};
