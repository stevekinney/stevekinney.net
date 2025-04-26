import { CourseMarkdownSchema } from '$lib/schemas/courses';
import { createOpenGraphImage } from '@/lib/open-graph';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => {
  const { course: courseId } = params;

  const { metadata } = CourseMarkdownSchema.parse(
    await import(`../../../../content/courses/${courseId}/README.md`),
  );

  const opengraph = await createOpenGraphImage(metadata.title, metadata.description);

  const course = {
    ...metadata,
    slug: courseId,
  };

  try {
    const { default: contents } = await import(`../../../../content/courses/${courseId}/_index.md`);

    return {
      contents,
      course,
      opengraph,
    };
  } catch {
    return {
      course,
      opengraph,
    };
  }
};
