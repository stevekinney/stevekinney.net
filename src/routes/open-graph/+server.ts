import { encode } from 'html-entities';
import satori from 'satori';
import sharp from 'sharp';

import metadata from '$lib/metadata';
import { OpenGraphImage } from './open-graph';

export const GET = async ({ url, fetch }) => {
  const title = url.searchParams.get('title') || metadata.title;
  const description = url.searchParams.get('description');

  const firaSansBold = await fetch('/fonts/fira-sans-500-normal.woff').then((res) =>
    res.arrayBuffer(),
  );

  const firaSansThin = await fetch('/fonts/fira-sans-300-normal.woff').then((res) =>
    res.arrayBuffer(),
  );

  const leagueGothic = await fetch('/fonts/league-gothic-400-normal.woff').then((res) =>
    res.arrayBuffer(),
  );

  const [mainTitle] = title
    .split(' | ')
    .map((line) => line.trim())
    .map((line) => encode(line));

  const svg = await satori(
    OpenGraphImage({
      title: mainTitle,
      description: encode(description || ''),
    }),
    {
      width: 1200,
      height: 630,
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

  const image = await sharp(Buffer.from(svg)).jpeg().toBuffer();

  const body = new ReadableStream<typeof image>({
    async start(controller) {
      controller.enqueue(image);
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable, no-transform',
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.length.toString(),
    },
  });
};
