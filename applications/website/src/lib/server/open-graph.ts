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

/**
 * Reset the module-level font cache. Test-only: lets each test exercise the
 * full font-load path (and its failure modes) instead of reusing a warm cache
 * from an earlier test.
 *
 * The wasm-init cache is intentionally NOT reset: resvg's `initWasm` can only
 * run once per process (it throws "Already initialized" on a second call), so
 * once it succeeds the cached promise must stay. This is why
 * `ensureWasmInitialized` only nulls its promise on a *failed* init — the retry
 * path can only be reached before the one successful initialization.
 */
export const resetOpenGraphCachesForTesting = (): void => {
  fontDataPromise = null;
};

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
): Promise<Uint8Array<ArrayBuffer>> => {
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
  // resvg's `asPng()` is declared as `Uint8Array` (defaulting the buffer to
  // `ArrayBufferLike`), but it always returns a fresh, exactly-sized array over
  // a plain `ArrayBuffer` — never `SharedArrayBuffer`. Narrowing it here lets the
  // backing buffer serve directly as a `Response` body without a second copy.
  const png = rendered.asPng() as Uint8Array<ArrayBuffer>;

  // Wasm-backed instances hold memory outside the JS heap; release it explicitly.
  rendered.free();
  renderer.free();

  return png;
};

type OpenGraphResponseOptions = {
  isVersioned?: boolean;
};

export const createOpenGraphResponse = (
  image: Uint8Array<ArrayBuffer>,
  { isVersioned = false }: OpenGraphResponseOptions = {},
): Response => {
  const cacheControl = isVersioned
    ? 'public, max-age=31536000, immutable, no-transform'
    : 'public, max-age=3600, stale-while-revalidate=86400, no-transform';

  // `asPng()` returns a fresh, exactly-sized `Uint8Array` (offset 0, no extra
  // bytes), so its backing buffer can serve as the body with no extra copy.
  return new Response(image.buffer, {
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
