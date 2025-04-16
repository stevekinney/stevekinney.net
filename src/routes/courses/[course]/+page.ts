// import { error } from '@sveltejs/kit';
import { CourseMetadataSchema } from '@/lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course } = params;

  const { default: content, metadata } = await import(
    `../../../../content/courses/${course}/README.md`
  );

  return {
    content,
    ...CourseMetadataSchema.parse({
      ...metadata,
      slug: course,
    }),
  };
};
