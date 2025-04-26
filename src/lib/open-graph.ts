import type { RequestEvent } from '@sveltejs/kit';
import { encode } from 'html-entities';
import satori from 'satori';
import OpenGraphImage from './open-graph-image';

type Fetch = RequestEvent['fetch'];

export async function createOpenGraphImage(
  title: string,
  description: string,
  fetch: Fetch,
): Promise<string> {
  const firaSansBold = await fetch('/fira-sans-500-normal.woff').then((res) => res.arrayBuffer());
  const firaSansThin = await fetch('/fira-sans-300-normal.woff').then((res) => res.arrayBuffer());
  const leagueGothic = await fetch('/league-gothic-400-normal.woff').then((res) =>
    res.arrayBuffer(),
  );

  const [mainTitle] = title
    .split(' | ')
    .map((line) => line.trim())
    .map((line) => encode(line));

  const svg = await satori(
    OpenGraphImage({
      title: mainTitle,
      description,
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

  // Use btoa to encode the SVG string in the browser
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
