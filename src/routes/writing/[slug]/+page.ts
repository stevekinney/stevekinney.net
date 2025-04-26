import { getPost } from '$lib/posts.js';
import { createOpenGraphImage } from '@/lib/open-graph';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  try {
    const post = await getPost(params.slug);
    const opengraph = await createOpenGraphImage(post.meta.title, post.meta.description);

    return {
      ...post,
      opengraph,
    };
  } catch {
    return error(404, `Post not found`);
  }
}
