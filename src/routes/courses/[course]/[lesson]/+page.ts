// import { error } from '@sveltejs/kit';
import { LessonMetadataSchema } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const { course, lesson } = params;

  const { default: content, metadata } = await import(
    `../../../../../content/courses/${course}/${lesson}.md`
  );

  return {
    content,
    ...LessonMetadataSchema.parse(metadata),
  };
};
