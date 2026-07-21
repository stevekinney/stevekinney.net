import { getCourseIndex, getGeneratedContent } from '$lib/server/content';
import type { PageServerLoad } from './$types';
import type { DashboardCourseSummary } from './dashboard-page-types';

export const prerender = true;

const title = 'Dashboard';
const description =
  'A live look at my GitHub activity, npm downloads, and course updates over the past year, recomputed at most once a day.';

/** Counts lessons per course by joining the flat lesson index on `courseSlug`. */
const countLessonsByCourse = (): Map<string, number> => {
  const counts = new Map<string, number>();

  for (const lesson of getGeneratedContent().lessons) {
    counts.set(lesson.courseSlug, (counts.get(lesson.courseSlug) ?? 0) + 1);
  }

  return counts;
};

/** Builds the course list the dashboard renders before any client data arrives. */
const buildCourseSummaries = (): DashboardCourseSummary[] => {
  const lessonCounts = countLessonsByCourse();

  return getCourseIndex().map((course) => ({
    slug: course.slug,
    title: course.title,
    description: course.description,
    path: course.path,
    lessonCount: lessonCounts.get(course.slug) ?? 0,
  }));
};

/**
 * Loads the static shell for `/dashboard`: title, description, and the
 * course list built from content at build time so crawlers see real course
 * content without waiting on the client-side `/api/dashboard` fetch.
 */
export const load: PageServerLoad = async () => {
  return {
    title,
    description,
    courses: buildCourseSummaries(),
  };
};
