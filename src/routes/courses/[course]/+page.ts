// import { error } from '@sveltejs/kit';
import { CourseMarkdownSchema } from '$lib/schemas/courses';
import { createOpenGraphImage } from '@/lib/open-graph';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course: slug } = params;

  const { default: content, metadata } = CourseMarkdownSchema.parse(
    await import(`../../../../content/courses/${slug}/README.md`),
  );

  const opengraph = await createOpenGraphImage(metadata.title, metadata.description);

  return {
    ...metadata,
    content,
    opengraph,
  };
};
