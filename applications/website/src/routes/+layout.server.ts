import { getPostIndex } from '$lib/server/content';

export const prerender = process.env.PRERENDER_ALL === '1';

export async function load() {
  return { posts: getPostIndex() };
}
