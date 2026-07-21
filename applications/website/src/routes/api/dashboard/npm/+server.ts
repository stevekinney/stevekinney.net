import { json } from '@sveltejs/kit';

import { getDashboardData } from '$lib/server/dashboard';

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
 * Serves the npm section of the dashboard snapshot as JSON, keyed off
 * that section's own status rather than the snapshot as a whole.
 */
export const GET = async (): Promise<Response> => {
  const data = await getDashboardData();
  const ok = data.npm.status === 'ok';

  return json(
    { generatedAt: data.generatedAt, window: data.window, npm: data.npm },
    { status: ok ? 200 : 503, headers: ok ? SUCCESS_HEADERS : FAILURE_HEADERS },
  );
};
