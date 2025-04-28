import { encode } from 'html-entities';
import satori from 'satori';
import sharp from 'sharp';

import metadata from '$lib/metadata';
import { OpenGraphImage } from './open-graph';

// Constants for image dimensions
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

// Font paths
const FONT_PATHS = {
  firaSansBold: '/fonts/fira-sans-500-normal.woff',
  firaSansThin: '/fonts/fira-sans-300-normal.woff',
  leagueGothic: '/fonts/league-gothic-400-normal.woff',
};

/**
 * Handler for generating Open Graph images
 */
export const GET = async ({ url, fetch }) => {
  // Extract parameters
  const title = url.searchParams.get('title') || metadata.title;
  const description = url.searchParams.get('description');

  // Load fonts in parallel
  const [firaSansBold, firaSansThin, leagueGothic] = await Promise.all([
    fetch(FONT_PATHS.firaSansBold).then((res) => res.arrayBuffer()),
    fetch(FONT_PATHS.firaSansThin).then((res) => res.arrayBuffer()),
    fetch(FONT_PATHS.leagueGothic).then((res) => res.arrayBuffer()),
  ]);

  // Extract main title
  const [mainTitle] = title
    .split(' | ')
    .map((line) => line.trim())
    .map((line) => encode(line));

  // Generate SVG with satori
  const svg = await satori(
    OpenGraphImage({
      title: mainTitle,
      description: encode(description || ''),
    }),
    {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      fonts: [
        {
          name: 'Fira Sans',
          weight: 300,
          style: 'normal',
          data: firaSansThin,
        },
        {
          name: 'Fira Sans',
          weight: 500,
          style: 'normal',
          data: firaSansBold,
        },
        {
          name: 'League Gothic',
          weight: 500,
          style: 'normal',
          data: leagueGothic,
        },
      ],
    },
  );

  // Convert SVG to JPEG
  const image = await sharp(Buffer.from(svg)).jpeg().toBuffer();

  // Create readable stream for response
  const body = new ReadableStream<typeof image>({
    async start(controller) {
      controller.enqueue(image);
      controller.close();
    },
  });

  // Return response with appropriate headers
  return new Response(body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.length.toString(),
    },
  });
};
