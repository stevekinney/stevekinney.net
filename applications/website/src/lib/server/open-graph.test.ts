import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { createOpenGraphResponse, renderOpenGraphImage } from './open-graph';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

const resvgWasmPath = fileURLToPath(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'));
const staticRoot = fileURLToPath(new URL('../../../static', import.meta.url));

/**
 * Serve the assets `renderOpenGraphImage` requests the same way SvelteKit's
 * runtime `fetch` would: the resvg `.wasm` from its installed package, and the
 * fonts from the app's `static/` directory.
 */
const assetFetch = (async (input: string) => {
  const path = typeof input === 'string' ? input : String(input);
  const pathname = path.startsWith('/') ? path : new URL(path).pathname;

  const file = pathname.endsWith('.wasm') ? resvgWasmPath : `${staticRoot}${pathname}`;
  return new Response(await readFile(file), { status: 200 });
}) as unknown as typeof fetch;

describe('renderOpenGraphImage', () => {
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
