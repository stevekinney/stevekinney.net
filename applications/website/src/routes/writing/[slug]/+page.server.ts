import { error, redirect } from '@sveltejs/kit';

import type { RepositoryPath } from '$lib/repository-path';
import { getPrerenderEntries, getWritingRoute } from '$lib/server/content';
import { renderWritingDocument } from '$lib/server/content-documents';

import type { PageServerLoad } from './$types';

export const prerender = true;
export const csr = false;

export const load: PageServerLoad = async ({ params }) => {
  const rawSlug = params.slug;
  const slug = rawSlug.replace(/\.md$/i, '');

  if (rawSlug !== slug) {
    throw redirect(308, `/writing/${slug}`);
  }

  const route = getWritingRoute(slug);
  if (!route) {
    throw error(404, 'Post not found');
  }

  return {
    slug: route.slug,
    sourcePath: route.sourcePath as RepositoryPath,
    meta: {
      title: route.title,
      description: route.description,
      date: route.date,
      modified: route.modified,
      tags: route.tags,
    },
    contentHtml: await renderWritingDocument(route.sourcePath),
  };
};

export function entries() {
  return getPrerenderEntries().writing;
}
