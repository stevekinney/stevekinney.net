import { json } from '@sveltejs/kit';

import { getDashboardData, isDashboardComplete } from '$lib/server/dashboard';

export const prerender = false;

// Deliberately NOT Vercel ISR: prerender functions strip non-200 response
// bodies (adapter-vercel cannot set exposeErrBody), which would break the
// 503-carries-body contract the dashboard page depends on. The s-maxage +
// stale-while-revalidate headers on success responses provide the 24-hour
// edge cache instead.

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400',
  'Access-Control-Allow-Origin': '*',
};

const FAILURE_HEADERS = {
  'Cache-Control': 'no-store',
  'Retry-After': '300',
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
