/** A course as known at build time, before the client enriches it with live update data. */
export type DashboardCourseSummary = {
  slug: string;
  title: string;
  description: string;
  path: string;
  lessonCount: number;
};
