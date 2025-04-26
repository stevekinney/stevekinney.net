import { CourseMetadataSchema } from '$lib/schemas/courses';
import { createOpenGraphImage } from '@/lib/open-graph';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const courses = import.meta.glob(`../../../content/courses/**/README.md`, {
    eager: true,
    import: 'metadata',
  });

  const walkthroughs = Object.entries(courses).map(([path, metadata]) => {
    const slug = path.split('/').slice(-2, -1)[0];

    if (typeof metadata !== 'object') throw new Error(`Invalid metadata for course at ${path}`);

    return CourseMetadataSchema.parse({ ...metadata, slug });
  });

  const title = 'Courses';
  const description =
    "A collection of courses that I've taught over the years, including full course walkthroughs and recordings from Frontend Masters.";

  const opengraph = await createOpenGraphImage(title, description, fetch);

  return {
    title,
    description,
    opengraph,
    walkthroughs,
  };
};
