import { CourseMetadataSchema } from '@/lib/schemas/courses';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  const courses = import.meta.glob(`../../../content/courses/**/README.md`, {
    eager: true,
    import: 'metadata',
  });

  const walkthroughs = Object.entries(courses).map(([path, metadata]) => {
    const slug = path.split('/').slice(-2, -1)[0];

    if (typeof metadata !== 'object') throw new Error(`Invalid metadata for course at ${path}`);

    return CourseMetadataSchema.parse({ ...metadata, slug });
  });

  return {
    walkthroughs,
  };
};
