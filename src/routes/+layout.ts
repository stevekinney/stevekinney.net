import { dev } from '$app/environment';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export const prerender = true;

export const load = async () => {
  // Import posts directly to avoid fetch during prerendering
  const { getPosts } = await import('$lib/posts');
  const posts = await getPosts();

  return {
    posts,
  };
};
