import { json } from '@sveltejs/kit';

import { getDashboardData, isDashboardComplete } from '$lib/server/dashboard';

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
  'Access-Control-Allow-Origin': '*',
};

/**
 * Serves the full dashboard snapshot as JSON.
 *
 * Responds with 503 and no-store caching headers when any section failed
 * to resolve, but the body always carries every section — healthy ones
 * included — so the dashboard page can render a partial snapshot even
 * from an unsuccessful response.
 */
export const GET = async (): Promise<Response> => {
  const data = await getDashboardData();
  const complete = isDashboardComplete(data);

  return json(data, {
    status: complete ? 200 : 503,
    headers: complete ? SUCCESS_HEADERS : FAILURE_HEADERS,
  });
};
