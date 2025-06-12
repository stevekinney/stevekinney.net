import { dev } from '$app/environment';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
import { readFile } from 'node:fs/promises';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const postsPath = path.join(__dirname, '../../content/writing/posts.json');

if (!dev) {
  injectSpeedInsights();
  inject({ mode: 'production' });
}

export const prerender = true;

export async function load() {
  const manifest = await readFile(postsPath, 'utf-8');
  const posts = JSON.parse(manifest);
  return { posts };
}
