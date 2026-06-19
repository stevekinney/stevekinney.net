import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url';
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
let wasmInitPromise: Promise<void> | null = null;

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

/**
 * Initialize the resvg WebAssembly module exactly once per server instance.
 *
 * `initWasm` throws if called more than once, so the promise is cached and
 * reused. The `.wasm` binary is imported through Vite's `?url` loader, which
 * emits it as an asset and bundles it into the serverless function — so it is
 * fetchable at runtime regardless of platform (unlike a native addon).
 */
const ensureWasmInitialized = async (fetch: RequestEvent['fetch']): Promise<void> => {
  if (!wasmInitPromise) {
    wasmInitPromise = (async () => {
      const response = await fetch(resvgWasmUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to load resvg WebAssembly module from ${resvgWasmUrl}: ${response.status} ${response.statusText}`,
        );
      }
      await initWasm(await response.arrayBuffer());
    })().catch((error) => {
      wasmInitPromise = null;
      throw error;
    });
  }

  return wasmInitPromise;
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

  const openGraphImage = OpenGraphImage(options) as Parameters<typeof satori>[0];

  const svg = await satori(openGraphImage, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fonts,
  });

  await ensureWasmInitialized(fetch);

  // Satori vectorizes all text into `<path>` elements using the fonts above, so
  // resvg needs no font buffers of its own to rasterize the card faithfully.
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: IMAGE_WIDTH },
  });
  const rendered = renderer.render();
  const png = rendered.asPng();

  // Wasm-backed instances hold memory outside the JS heap; release it explicitly.
  rendered.free();
  renderer.free();

  return png;
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

  const body = new ArrayBuffer(image.byteLength);
  new Uint8Array(body).set(image);

  return new Response(body, {
    headers: {
      // resvg always emits PNG; the `.jpg` route name is cosmetic and social
      // scrapers honor the Content-Type, not the URL extension.
      'Content-Type': 'image/png',
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
      'Content-Length': image.byteLength.toString(),
    },
  });
};
