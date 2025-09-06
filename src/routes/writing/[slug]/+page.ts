import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  try {
    const post = await getPost(params.slug);

    return {
      ...post,
    };
  } catch {
    throw error(404, 'Post not found');
  }
};
