import { error } from '@sveltejs/kit';

import { createOpenGraphResponse, renderOpenGraphImage } from '$lib/server/open-graph';
import { resolveOpenGraphMetadata } from '$lib/server/open-graph-metadata';

import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const metadata = await resolveOpenGraphMetadata('/writing');

  if (!metadata) {
    throw error(404, 'Open Graph metadata not found');
  }

  const image = await renderOpenGraphImage(metadata, fetch);

  return createOpenGraphResponse(image, { isVersioned: url.searchParams.has('v') });
};
