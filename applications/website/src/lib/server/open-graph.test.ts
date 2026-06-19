import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createOpenGraphResponse,
  renderOpenGraphImage,
  resetOpenGraphCachesForTesting,
} from './open-graph';

import type { RequestEvent } from '@sveltejs/kit';

type ServerFetch = RequestEvent['fetch'];

// SvelteKit types `fetch` as the full global `typeof fetch`, which carries a
// `preconnect` method our test mocks never use. Wrap the handler so the value
// genuinely satisfies the type instead of casting the gap away.
const asServerFetch = (handler: (input: URL | RequestInfo) => Promise<Response>): ServerFetch =>
  Object.assign(handler, { preconnect: () => undefined });

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

const resvgWasmPath = fileURLToPath(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'));
const staticRoot = fileURLToPath(new URL('../../../static', import.meta.url));

/**
 * Serve the assets `renderOpenGraphImage` requests the same way SvelteKit's
 * runtime `fetch` would: the resvg `.wasm` from its installed package, and the
 * fonts from the app's `static/` directory.
 */
const toPathname = (input: URL | RequestInfo): string => {
  const path = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return path.startsWith('/') ? path : new URL(path).pathname;
};

const assetFetch: ServerFetch = asServerFetch(async (input) => {
  const pathname = toPathname(input);
  const file = pathname.endsWith('.wasm') ? resvgWasmPath : `${staticRoot}${pathname}`;
  return new Response(await readFile(file), { status: 200 });
});

/** An `assetFetch` that 404s any request whose path matches `failFor`. */
const failingFetchFor = (failFor: (pathname: string) => boolean): ServerFetch =>
  asServerFetch(async (input) => {
    const pathname = toPathname(input);
    if (failFor(pathname)) {
      return new Response('not found', { status: 404, statusText: 'Not Found' });
    }
    const file = pathname.endsWith('.wasm') ? resvgWasmPath : `${staticRoot}${pathname}`;
    return new Response(await readFile(file), { status: 200 });
  });

describe('renderOpenGraphImage', () => {
  afterEach(() => {
    resetOpenGraphCachesForTesting();
  });

  it('rasterizes the Satori card to a PNG via the WebAssembly renderer', async () => {
    const image = await renderOpenGraphImage(
      { title: 'Thoughts on AI Safety', description: 'A generated card.' },
      assetFetch,
    );

    expect(image).toBeInstanceOf(Uint8Array);
    // The PNG magic number proves we returned a real raster, not the SVG source
    // or some other fallback that would have shipped before this code path.
    expect([...image.slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(image.byteLength).toBeGreaterThan(1000);
  });

  it('renders without a fonts/portrait fallback — the SVG source is never returned as the image', async () => {
    const image = await renderOpenGraphImage(
      { title: 'No fallback here', description: 'Real raster only.' },
      assetFetch,
    );

    // Before this fix a sharp failure returned the raw SVG (or the portrait
    // PNG). A real raster never starts with the SVG/XML preamble.
    const prefix = Buffer.from(image.slice(0, 16)).toString('utf8');
    expect(prefix).not.toContain('<svg');
    expect(prefix).not.toContain('<?xml');
  });

  it('throws instead of falling back when an asset fails to load', async () => {
    // The whole point of the fix: a failed render surfaces loudly rather than
    // silently shipping the wrong image. A missing font is the earliest asset
    // load, so it exercises the no-fallback contract without depending on the
    // process-global resvg `initWasm` (which can only run once per process).
    await expect(
      renderOpenGraphImage(
        { title: 'Broken', description: null },
        failingFetchFor((pathname) => pathname.startsWith('/fonts/')),
      ),
    ).rejects.toThrow(/Failed to load font/);
  });
});

describe('createOpenGraphResponse', () => {
  it('serves PNG bytes with an image/png content type', () => {
    const response = createOpenGraphResponse(new Uint8Array(PNG_MAGIC));
    expect(response.headers.get('Content-Type')).toBe('image/png');
  });

  it('marks versioned images as immutable and unversioned images as short-lived', () => {
    const versioned = createOpenGraphResponse(new Uint8Array(PNG_MAGIC), { isVersioned: true });
    expect(versioned.headers.get('Cache-Control')).toContain('immutable');

    const unversioned = createOpenGraphResponse(new Uint8Array(PNG_MAGIC));
    expect(unversioned.headers.get('Cache-Control')).toContain('max-age=3600');
  });
});
