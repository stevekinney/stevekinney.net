import { z } from 'zod';

import type { CourseUpdate, DashboardData, GithubStats, NpmStats } from '$lib/dashboard-types';

const dashboardStatWindowSchema = z.object({
  from: z.string(),
  to: z.string(),
});

const githubRepositoryCommitsSchema = z.object({
  nameWithOwner: z.string(),
  url: z.string(),
  stargazerCount: z.number(),
  commits: z.number(),
});

const githubStatsSchema: z.ZodType<GithubStats> = z.object({
  login: z.string(),
  profileUrl: z.string(),
  followers: z.number(),
  publicRepositories: z.number(),
  totalStars: z.number(),
  pullRequests: z.object({
    openNow: z.number(),
    mergedLastYear: z.number(),
  }),
  commits: z.object({
    totalLastYear: z.number(),
    privateContributionsLastYear: z.number(),
    byRepository: z.array(githubRepositoryCommitsSchema),
  }),
  issues: z.object({
    openedLastYear: z.number(),
    closedLastYear: z.number(),
  }),
  reviews: z.object({
    totalLastYear: z.number(),
  }),
});

const npmPackageStatsSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  url: z.string(),
  downloadsLastYear: z.number(),
});

const npmStatsSchema: z.ZodType<NpmStats> = z.object({
  packageCount: z.number(),
  totalDownloadsLastYear: z.number(),
  topPackages: z.array(npmPackageStatsSchema),
});

const courseUpdateSchema: z.ZodType<CourseUpdate> = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  path: z.string(),
  lessonCount: z.number(),
  lastUpdatedAt: z.string(),
  lastCommit: z
    .object({
      message: z.string(),
      url: z.string(),
      sha: z.string(),
    })
    .nullable(),
});

/** Builds the `{ status: 'ok', data } | { status: 'error', error }` shape shared by every section. */
function dashboardSection<Schema extends z.ZodType>(schema: Schema) {
  return z.discriminatedUnion('status', [
    z.object({ status: z.literal('ok'), data: schema }),
    z.object({ status: z.literal('error'), error: z.string() }),
  ]);
}

/**
 * Validates an untrusted `/api/dashboard` response body against the shared
 * `DashboardData` contract before the page ever renders it.
 */
export const dashboardDataSchema: z.ZodType<DashboardData> = z.object({
  generatedAt: z.string(),
  window: dashboardStatWindowSchema,
  github: dashboardSection(githubStatsSchema),
  npm: dashboardSection(npmStatsSchema),
  courses: dashboardSection(z.array(courseUpdateSchema)),
});
