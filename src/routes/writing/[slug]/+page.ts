import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  try {
    return await getPost(params.slug);
  } catch {
    return error(404, `Post not found`);
  }
}
