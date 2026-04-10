import { error } from '@sveltejs/kit';
import { getPostIndex } from '$lib/server/content';
import { paginate, POSTS_PER_PAGE } from '$lib/pagination';
import type { PageServerLoad } from './$types';

export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
  const page = parseInt(params.page, 10);

  if (isNaN(page) || page < 2) {
    error(404, 'Page not found');
  }

  const allPosts = getPostIndex();
  const { items: posts, currentPage, totalPages } = paginate(allPosts, page);

  if (page > totalPages) {
    error(404, 'Page not found');
  }

  return {
    title: `Writing — Page ${page}`,
    description:
      "A collection of articles, essays, and other writing that I've done over the years.",
    posts,
    currentPage,
    totalPages,
  };
};

export function entries() {
  const allPosts = getPostIndex();
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const result = [];

  for (let page = 2; page <= totalPages; page++) {
    result.push({ page: String(page) });
  }

  return result;
}
