import { dev } from '$app/environment';
import posts from '$lib/posts.json';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
import { readFile } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export const prerender = true;

export async function load() {
  return { posts };
}
