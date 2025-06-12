import { CourseMetadataSchema, type CourseMetadata } from '$lib/schemas/courses';
import type { PageLoad } from './$types';

const title = 'Courses';
const description =
  "A collection of courses that I've taught over the years, including full course walkthroughs and recordings from Frontend Masters.";

/**
 * Interface for course data with slug,
 */
interface CourseWithSlug extends CourseMetadata {
  slug: string;
}

/**
 * Page metadata for courses page.
 */
interface CoursesPageData {
  title: string;
  description: string;
  walkthroughs: CourseWithSlug[];
}

/**
 * Extracts the course slug from a file path,
 * @param path - Full path to the course `README.md` file.
 * @returns The extracted course slug.
 */
const extractSlugFromPath = (path: string): string => {
  return path.split('/').slice(-2, -1)[0];
};

/**
 * Loads courses from content directory and prepares data for the page.
 */
export const load: PageLoad = async (): Promise<CoursesPageData> => {
  // Get all course README.md files and their metadata
  const courseFiles = import('../../../content/courses/courses.json');

  // Process course files into structured data with slugs.
  const walkthroughs = Object.entries(courseFiles).map(([path, metadata]) => {
    try {
      const slug = extractSlugFromPath(path);
      const validatedMetadata = CourseMetadataSchema.parse(metadata);

      return {
        ...validatedMetadata,
        slug,
      };
    } catch (error) {
      console.error(`Error processing course at ${path}.`, { error, metadata });
      throw error;
    }
  });

  return {
    title,
    description,
    walkthroughs,
  };
};
