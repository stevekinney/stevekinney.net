import metadata from '$lib/metadata';
import { createOpenGraphResponse, renderOpenGraphImage } from '$lib/server/open-graph';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * Parse boolean parameters from URL query string
 */
const parseBoolean = (value: string | null): boolean | undefined => {
  if (value === null) return undefined;
  return value.toLowerCase() === 'true';
};

/**
 * Handler for generating Open Graph images
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
  // Extract parameters
  const title = url.searchParams.get('title') || metadata.title;
  const description = url.searchParams.get('description');
  const backgroundColor = url.searchParams.get('backgroundColor') ?? undefined;
  const textColor = url.searchParams.get('textColor') ?? undefined;
  const accentColor = url.searchParams.get('accentColor') ?? undefined;
  const secondaryAccentColor = url.searchParams.get('secondaryAccentColor') ?? undefined;
  const hideFooter = parseBoolean(url.searchParams.get('hideFooter'));
  const handle = url.searchParams.get('handle') ?? undefined;
  const siteUrl = url.searchParams.get('url') ?? undefined;

  const image = await renderOpenGraphImage(
    {
      title,
      description,
      backgroundColor,
      textColor,
      accentColor,
      secondaryAccentColor,
      hideFooter,
      handle,
      url: siteUrl,
    },
    fetch,
  );

  return createOpenGraphResponse(image, { isVersioned: true });
};
