import { dev } from '$app/environment';
import { getPostIndex } from '$lib/server/content';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export async function load() {
  return { posts: getPostIndex() };
}
