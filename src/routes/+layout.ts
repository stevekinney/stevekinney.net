import { dev } from '$app/environment';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export const prerender = true;

export async function load({ data }) {
  const { posts } = data;
  return { posts };
}
