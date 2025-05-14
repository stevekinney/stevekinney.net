import { dev } from '$app/environment';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export const prerender = true;

export const load = async ({ fetch }) => {
  const posts = await fetch('/writing');
  const postsData = await posts.json();

  return {
    posts: postsData,
  };
};
