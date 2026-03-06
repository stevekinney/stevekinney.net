import { getPostIndex } from '$lib/server/content';
import { paginate } from '$lib/pagination';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async () => {
  const allPosts = getPostIndex();
  const { items: posts, currentPage, totalPages } = paginate(allPosts, 1);

  return {
    title: 'Writing',
    description:
      "A collection of articles, essays, and other writing that I've done over the years.",
    posts,
    currentPage,
    totalPages,
  };
};
