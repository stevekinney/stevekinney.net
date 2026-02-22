import { error } from '@sveltejs/kit';

import { createOpenGraphResponse, renderOpenGraphImage } from '$lib/server/open-graph';
import { normalizeOpenGraphPath, resolveOpenGraphMetadata } from '$lib/server/open-graph-metadata';

import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, url, fetch }) => {
  const path = normalizeOpenGraphPath(params.path ? `/${params.path}` : '/');
  const metadata = await resolveOpenGraphMetadata(path);

  if (!metadata) {
    throw error(404, 'Open Graph metadata not found');
  }

  const image = await renderOpenGraphImage(metadata, fetch);

  return createOpenGraphResponse(image, { isVersioned: url.searchParams.has('v') });
};
