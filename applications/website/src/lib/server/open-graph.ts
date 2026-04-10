import satori from 'satori';

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
let fallbackRasterPromise: Promise<Uint8Array> | null = null;
let didWarnAboutSharp = false;

const loadFonts = async (fetch: RequestEvent['fetch']): Promise<ArrayBuffer[]> => {
  if (!fontDataPromise) {
    fontDataPromise = Promise.all(
      FONT_INFO.map(async (font) => {
        const res = await fetch(font.path);

        if (!res.ok) {
          throw new Error(`Failed to load font ${font.path}: ${res.status} ${res.statusText}`);
        }

        return res.arrayBuffer();
      }),
    ).catch((error) => {
      fontDataPromise = null;
      throw error;
    });
  }

  return fontDataPromise;
};

const loadFallbackRaster = async (fetch: RequestEvent['fetch']): Promise<Uint8Array | null> => {
  if (!fallbackRasterPromise) {
    fallbackRasterPromise = (async () => {
      const response = await fetch('/portrait.png');
      if (!response.ok) {
        throw new Error(
          `Failed to load fallback raster image: ${response.status} ${response.statusText}`,
        );
      }
      return new Uint8Array(await response.arrayBuffer());
    })().catch((error) => {
      fallbackRasterPromise = null;
      throw error;
    });
  }

  return fallbackRasterPromise;
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

  try {
    const { default: sharp } = await import('sharp');
    const image = await sharp(Buffer.from(svg)).jpeg().toBuffer();
    return new Uint8Array(image);
  } catch (error) {
    if (!didWarnAboutSharp) {
      didWarnAboutSharp = true;
      console.warn('[open-graph] Sharp unavailable, falling back to static raster image.', error);
    }

    try {
      const fallbackRaster = await loadFallbackRaster(fetch);
      if (fallbackRaster) return fallbackRaster;
    } catch (fallbackError) {
      if (!didWarnAboutSharp) {
        console.warn('[open-graph] Failed to load fallback raster image.', fallbackError);
      }
    }

    return new Uint8Array(Buffer.from(svg));
  }
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

  const prefix = Buffer.from(image.slice(0, 16)).toString('utf8');
  const isSvg = prefix.includes('<svg') || prefix.includes('<?xml');

  const body = new ArrayBuffer(image.byteLength);
  new Uint8Array(body).set(image);

  return new Response(body, {
    headers: {
      'Content-Type': isSvg ? 'image/svg+xml' : 'image/jpeg',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.byteLength.toString(),
    },
  });
};
