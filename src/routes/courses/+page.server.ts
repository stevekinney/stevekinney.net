import { getCourseIndex } from '$lib/server/content';
import type { PageServerLoad } from './$types';

const title = 'Courses';
const description =
  "A collection of courses that I've taught over the years, including full course walkthroughs and recordings from Frontend Masters.";

/**
 * Loads courses from content directory and prepares data for the page.
 */
export const load: PageServerLoad = async () => {
  // Get all course README.md files and their metadata

  return {
    title,
    description,
    walkthroughs: getCourseIndex(),
  };
};
