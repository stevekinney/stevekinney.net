import satori from 'satori';
import sharp from 'sharp';

import { OpenGraphImage } from '../../routes/open-graph/open-graph';

import type { RequestEvent } from '@sveltejs/kit';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

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
    weight: 500,
    style: 'normal',
    path: '/fonts/league-gothic-400-normal.woff',
  },
] as const;

export type OpenGraphOptions = {
  title?: string;
  description?: string | null;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  secondaryAccentColor?: string;
  hideFooter?: boolean;
  handle?: string;
  url?: string;
};

let fontDataPromise: Promise<ArrayBuffer[]> | null = null;

const loadFonts = async (fetch: RequestEvent['fetch']): Promise<ArrayBuffer[]> => {
  if (!fontDataPromise) {
    fontDataPromise = Promise.all(
      FONT_INFO.map((font) => fetch(font.path).then((res: Response) => res.arrayBuffer())),
    );
  }

  return fontDataPromise;
};

export const renderOpenGraphImage = async (
  options: OpenGraphOptions,
  fetch: RequestEvent['fetch'],
): Promise<Uint8Array> => {
  const loadedFontData = await loadFonts(fetch);

  const fonts = FONT_INFO.map((font, index) => ({
    name: font.name,
    weight: font.weight,
    style: font.style,
    data: loadedFontData[index],
  }));

  const svg = await satori(OpenGraphImage(options), {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts,
  });

  const image = await sharp(Buffer.from(svg)).jpeg().toBuffer();

  return new Uint8Array(image);
};

type OpenGraphResponseOptions = {
  isVersioned?: boolean;
};

export const createOpenGraphResponse = (
  image: Uint8Array,
  { isVersioned = false }: OpenGraphResponseOptions = {},
): Response => {
  const cacheControl = isVersioned
    ? 'public, max-age=31536000, immutable, no-transform'
    : 'public, max-age=3600, stale-while-revalidate=86400, no-transform';

  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.byteLength.toString(),
    },
  });
};
