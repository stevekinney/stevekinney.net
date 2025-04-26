import { getPost } from '$lib/posts.js';
import { createOpenGraphImage } from '@/lib/open-graph';
import { error } from '@sveltejs/kit';

export async function load({ params, fetch }) {
  try {
    const post = await getPost(params.slug);
    const opengraph = await createOpenGraphImage(post.meta.title, post.meta.description, fetch);

    return {
      ...post,
      opengraph,
    };
  } catch {
    return error(404, `Post not found`);
  }
}
