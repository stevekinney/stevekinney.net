// import { error } from '@sveltejs/kit';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course: slug } = params;

  const { default: content, metadata } = CourseMarkdownSchema.parse(
    await import(`../../../../content/courses/${slug}/README.md`),
  );

  return {
    ...metadata,
    content,
  };
};
