import satori from 'satori';
import sharp from 'sharp';

import metadata from '$lib/metadata';
import { OpenGraphImage } from './open-graph';

// Constants for image dimensions
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

// Configuration for fonts
const FONT_INFO = [
  {
    name: 'Fira Sans',
    weight: 300,
    style: 'normal',
    path: '/fonts/fira-sans-300-normal.woff',
  },
  {
    name: 'Fira Sans',
    weight: 500,
    style: 'normal',
    path: '/fonts/fira-sans-500-normal.woff',
  },
  {
    name: 'League Gothic',
    weight: 500, // As per original Satori config, Satori matches this weight.
    style: 'normal',
    path: '/fonts/league-gothic-400-normal.woff',
  },
] as const;

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
export const GET = async ({ url, fetch }) => {
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

  // Load fonts in parallel
  const loadedFontData = await Promise.all(
    FONT_INFO.map((font) => fetch(font.path).then((res) => res.arrayBuffer())),
  );

  // Prepare fonts for Satori
  const satoriFontsConfig = FONT_INFO.map((font, index) => ({
    name: font.name,
    weight: font.weight,
    style: font.style,
    data: loadedFontData[index],
  }));

  // Generate SVG with satori
  const svg = await satori(
    OpenGraphImage({
      title,
      description,
      backgroundColor,
      textColor,
      accentColor,
      secondaryAccentColor,
      hideFooter,
      handle,
      url: siteUrl,
    }),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fonts: satoriFontsConfig,
    },
  );

  // Convert SVG to JPEG
  const image = await sharp(Buffer.from(svg)).jpeg().toBuffer();

  // Return response with appropriate headers
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.length.toString(),
    },
  });
};
