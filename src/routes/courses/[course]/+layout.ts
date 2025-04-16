import { CourseMetadataSchema } from '$lib/schemas/courses';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
  const { course: courseId } = params;

  const { metadata } = await import(`../../../../content/courses/${courseId}/README.md`);

  const course = CourseMetadataSchema.parse({
    ...metadata,
    slug: courseId,
  });

  try {
    const { default: contents } = await import(`../../../../content/courses/${courseId}/_index.md`);

    return {
      contents,
      course,
    };
  } catch {
    return {
      course,
    };
  }
};
