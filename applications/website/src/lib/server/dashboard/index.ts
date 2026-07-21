import type { DashboardData, DashboardSection } from '$lib/dashboard-types';

import { createCachedLoader } from './cache';
import { fetchCourseUpdates } from './courses';
import { fetchGithubStats } from './github';
import { fetchNpmStats } from './npm';
import { lastYearWindow } from './stat-window';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const RETRY_IN_MILLISECONDS = 5 * 60 * 1000;

/** True when every dashboard section resolved successfully. */
export const isDashboardComplete = (data: DashboardData): boolean =>
  data.github.status === 'ok' && data.npm.status === 'ok' && data.courses.status === 'ok';

const toSection = async <T>(promise: Promise<T>): Promise<DashboardSection<T>> => {
  try {
    return { status: 'ok', data: await promise };
  } catch (error) {
    return { status: 'error', error: error instanceof Error ? error.message : String(error) };
  }
};

const computeDashboardData = async (): Promise<DashboardData> => {
  const now = new Date();
  const window = lastYearWindow(now);

  const [github, npm, courses] = await Promise.all([
    toSection(fetchGithubStats(fetch, window)),
    toSection(fetchNpmStats(fetch)),
    toSection(fetchCourseUpdates(fetch)),
  ]);

  return { generatedAt: now.toISOString(), window, github, npm, courses };
};

/**
 * Returns the dashboard snapshot, computing it at most once every 24 hours per
 * server instance and deduping concurrent requests onto one computation.
 *
 * Vercel's ISR cache (configured on the routes that call this) provides the
 * durable, cross-instance 24-hour cache; this memo keeps a warm instance from
 * recomputing and keeps a thundering herd down to a single upstream fan-out.
 * Snapshots with failed sections are only held for five minutes so an outage
 * or missing token is retried promptly instead of being served all day.
 */
export const getDashboardData = createCachedLoader(computeDashboardData, {
  timeToLive: DAY_IN_MILLISECONDS,
  retryTimeToLive: RETRY_IN_MILLISECONDS,
  isComplete: isDashboardComplete,
});
