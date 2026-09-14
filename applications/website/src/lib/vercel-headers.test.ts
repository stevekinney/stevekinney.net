import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, it } from 'vitest';

it('allows same-origin and published Blob PDFs under the production CSP', async () => {
  const vercel = JSON.parse(
    await readFile(path.resolve(process.cwd(), '../../vercel.json'), 'utf8'),
  ) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
  const csp = vercel.headers
    .find((entry) => entry.source === '/((?!generated/playgrounds/[a-f0-9]{64}\\.(?:html|css)$).*)')
    ?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;

  expect(csp).toContain(
    "object-src 'self' https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com",
  );
  expect(csp).toContain("media-src 'self' https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com");
});
