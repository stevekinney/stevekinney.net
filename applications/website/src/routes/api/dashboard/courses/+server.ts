import { json } from '@sveltejs/kit';

import { getDashboardData } from '$lib/server/dashboard';

import type { Config } from '@sveltejs/adapter-vercel';

export const prerender = false;

// Deliberately NOT Vercel ISR: prerender functions strip non-200 response
// bodies (adapter-vercel cannot set exposeErrBody), which would break the
// 503-carries-body contract the dashboard page depends on. The s-maxage +
// stale-while-revalidate headers on success responses provide the 24-hour
// edge cache instead.
//
// maxDuration is raised because a cold compute fans out to GitHub GraphQL
// (serialized to avoid its secondary rate limit — see github.ts), GitHub
// REST, and the npm registry; measured live, that combination exceeded
// Vercel's 15-second default and 504'd before ever producing a response.
export const config: Config = { maxDuration: 60 };

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'Access-Control-Allow-Origin': '*',
};

const FAILURE_HEADERS = {
  'Cache-Control': 'no-store',
  'Retry-After': '300',
};

/**
 * Serves the course-updates section of the dashboard snapshot as JSON,
 * keyed off that section's own status rather than the snapshot as a whole.
 */
export const GET = async (): Promise<Response> => {
  const data = await getDashboardData();
  const ok = data.courses.status === 'ok';

  return json(
    { generatedAt: data.generatedAt, window: data.window, courses: data.courses },
    { status: ok ? 200 : 503, headers: ok ? SUCCESS_HEADERS : FAILURE_HEADERS },
  );
};
