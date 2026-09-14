import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, it } from 'vitest';

it('keeps the generated Obsidian artifact in serverless route bundles', async () => {
  const vercel = JSON.parse(
    await readFile(path.resolve(process.cwd(), '../../vercel.json'), 'utf8'),
  ) as {
    functions: Record<string, { includeFiles: string[] }>;
    headers: { headers: { key: string; value: string }[] }[];
  };
  expect(vercel.functions['applications/website/src/routes/**/+server.ts']?.includeFiles).toContain(
    'applications/website/.generated/obsidian-content.json',
  );
});

it('allows same-origin and published Blob PDFs under the production CSP', async () => {
  const vercel = JSON.parse(
    await readFile(path.resolve(process.cwd(), '../../vercel.json'), 'utf8'),
  ) as { headers: { headers: { key: string; value: string }[] }[] };
  const csp = vercel.headers
    .flatMap((entry) => entry.headers)
    .find((header) => header.key === 'Content-Security-Policy')?.value;

  expect(csp).toContain(
    "object-src 'self' https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com",
  );
  expect(csp).toContain("media-src 'self' https://s2mkrsfdifk0dskd.public.blob.vercel-storage.com");
});
