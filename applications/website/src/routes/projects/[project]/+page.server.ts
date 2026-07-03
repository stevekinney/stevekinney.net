import { error } from '@sveltejs/kit';

import type { RepositoryPath } from '$lib/repository-path';
import { getPrerenderEntries, getProjectRoute } from '$lib/server/content';
import { renderProjectDocument } from '$lib/server/content-documents';

import type { PageServerLoad } from './$types';

export const prerender = true;
export const csr = false;

const getYouTubeEmbedUrl = (youtubeUrl: string | undefined): string | undefined => {
  if (!youtubeUrl) return undefined;

  try {
    const url = new URL(youtubeUrl);
    const host = url.hostname.replace(/^www\./, '');
    const videoId = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');

    if (!videoId) return undefined;

    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return undefined;
  }
};

export const load: PageServerLoad = async ({ params }) => {
  const route = getProjectRoute(params.project);
  if (!route) {
    throw error(404, 'Project not found');
  }

  return {
    project: {
      slug: route.projectSlug,
      name: route.name,
      description: route.description,
      githubUrl: route.githubUrl,
      productionUrl: route.productionUrl,
      writingPath: route.writingPath,
      youtubeUrl: route.youtubeUrl,
      youtubeEmbedUrl: getYouTubeEmbedUrl(route.youtubeUrl),
    },
    sourcePath: route.sourcePath as RepositoryPath,
    contentHtml: await renderProjectDocument(route.sourcePath),
  };
};

export function entries() {
  return getPrerenderEntries().projects;
}
