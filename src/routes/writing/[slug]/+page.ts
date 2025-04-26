import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  try {
    const post = await getPost(params.slug);

    return {
      ...post,
    };
  } catch {
    return error(404, `Post not found`);
  }
}
