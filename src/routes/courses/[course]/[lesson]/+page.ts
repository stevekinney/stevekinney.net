import { CourseMarkdownSchema } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course, lesson } = params;

  const { default: content, metadata } = CourseMarkdownSchema.parse(
    await import(`../../../../../content/courses/${course}/${lesson}.md`),
  );

  return {
    content,
    ...metadata,
  };
};
