import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PLAYGROUND_CONTENT_SECURITY_POLICY,
  playgroundResponseHeaders,
} from '@stevekinney/utilities/tailwind-playground-policy';

type VercelHeader = { key: string; value: string };
type VercelHeaderRule = { source: string; headers: VercelHeader[] };
type VercelConfiguration = { headers: VercelHeaderRule[] };

const vercelConfiguration = JSON.parse(
  readFileSync(path.resolve(process.cwd(), '../../vercel.json'), 'utf8'),
) as VercelConfiguration;

const findHeaders = (source: string): Map<string, string> => {
  const rule = vercelConfiguration.headers.find((entry) => entry.source === source);
  if (!rule) throw new Error(`Missing Vercel header rule for ${source}.`);
  return new Map(rule.headers.map((header) => [header.key, header.value]));
};

describe('playground deployment headers', () => {
  it('keeps the static playground document policy in sync with the shared utility', () => {
    const productionHeaders = playgroundResponseHeaders(true);
    const htmlHeaders = findHeaders('/generated/playgrounds/([a-f0-9]{64}\\.html)');

    expect(htmlHeaders.get('Content-Security-Policy')).toBe(PLAYGROUND_CONTENT_SECURITY_POLICY);
    expect(htmlHeaders.get('Content-Security-Policy')).toBe(
      productionHeaders['Content-Security-Policy'],
    );
    expect(htmlHeaders.get('X-Frame-Options')).toBe(productionHeaders['X-Frame-Options']);
    expect(htmlHeaders.get('X-Content-Type-Options')).toBe(
      productionHeaders['X-Content-Type-Options'],
    );
    expect(htmlHeaders.get('Referrer-Policy')).toBe(productionHeaders['Referrer-Policy']);
    expect(htmlHeaders.get('Cache-Control')).toBe(productionHeaders['Cache-Control']);
  });

  it('does not put document sandbox policy on playground CSS assets', () => {
    const cssHeaders = findHeaders('/generated/playgrounds/([a-f0-9]{64}\\.css)');

    expect(cssHeaders.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(cssHeaders.has('Content-Security-Policy')).toBe(false);
    expect(cssHeaders.has('X-Frame-Options')).toBe(false);
  });

  it('keeps the website frame-denied while allowing it to embed same-origin playgrounds', () => {
    const websiteHeaders = findHeaders(
      '/((?!generated/playgrounds/[a-f0-9]{64}\\.(?:html|css)$).*)',
    );
    const contentSecurityPolicy = websiteHeaders.get('Content-Security-Policy') ?? '';

    expect(websiteHeaders.get('X-Frame-Options')).toBe('DENY');
    expect(contentSecurityPolicy).toContain("frame-src 'self'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
  });

  it('reserves immutable child policies for exact generated filenames', () => {
    for (const pathname of [
      `/generated/playgrounds/${'a'.repeat(64)}xhtml`,
      `/generated/playgrounds/${'b'.repeat(64)}xcss`,
      '/generated/playgrounds/other.html',
      `/generated/playgrounds/nested/${'a'.repeat(64)}.html`,
      `/generated/playgrounds/${'a'.repeat(64)}.html/extra`,
    ]) {
      const matchingHeaders = vercelConfiguration.headers
        .filter((rule) => new RegExp(`^${rule.source}$`).test(pathname))
        .flatMap((rule) => rule.headers);
      const policies = matchingHeaders.filter((header) => header.key === 'Content-Security-Policy');
      expect(policies).toHaveLength(1);
      expect(policies[0].value).toContain("frame-ancestors 'none'");
      expect(matchingHeaders.filter((header) => header.key === 'Cache-Control')).toHaveLength(0);
    }
  });

  it('applies exactly one framing policy to each response', () => {
    for (const pathname of [
      '/courses/tailwind/building-a-button',
      `/generated/playgrounds/${'a'.repeat(64)}.html`,
      `/generated/playgrounds/${'b'.repeat(64)}.css`,
    ]) {
      const matchingHeaders = vercelConfiguration.headers
        .filter((rule) => new RegExp(`^${rule.source}$`).test(pathname))
        .flatMap((rule) => rule.headers);
      const policies = matchingHeaders.filter((header) => header.key === 'Content-Security-Policy');
      const framing = matchingHeaders.filter((header) => header.key === 'X-Frame-Options');
      expect(policies).toHaveLength(pathname.endsWith('.css') ? 0 : 1);
      expect(framing).toHaveLength(pathname.endsWith('.css') ? 0 : 1);
      if (pathname.endsWith('.html')) expect(framing[0].value).toBe('SAMEORIGIN');
      if (pathname.startsWith('/courses/')) expect(framing[0].value).toBe('DENY');
    }
  });
});
