import { getPostIndex } from '$lib/server/content';

export const prerender = true;

export async function load() {
  return { posts: getPostIndex() };
}
