import { getLastModifiedDate } from '$lib/get-last-modified-date';
import metadata from '$lib/metadata';
import type { Element } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

export const prerender = true;

const dynamicRoute = /\[\w+\]/;

const getPriority = (path: string): number => {
  if (path.endsWith('/README.md')) return 0.8;
  if (path.includes('/writing/')) return 0.7;
  if (path.includes('/content/')) return 0.5;

  if (path.startsWith('/src/routes/')) {
    const depth = path.split('/').length - 4; // Adjust for the number of segments in the path
    return 1.0 - depth * 0.1; // Decrease priority based on depth
  }

  return 0.5;
};

const getUrl = (path: string): string => {
  return (
    metadata.url +
    path
      .replace('.md', '')
      .replace('/content', '')
      .replace('/README', '')
      .replace('/src/routes', '')
      .replace('/+page', '')
      .replace('.svelte', '')
  );
};

export const GET = async () => {
  const checked: Set<string> = new Set();
  const paths: Element[] = [];
  let mostRecent = new Date(0);

  const filePaths = [
    Object.keys(import.meta.glob('/src/routes/**/+page.{md,svelte}')),
    Object.keys(import.meta.glob('/content/**/!(meta-)*.md')),
  ].flat();

  for (const path of filePaths) {
    if (dynamicRoute.test(path)) continue; // Skip dynamic routes
    if (path.includes('_index')) continue;

    const url = getUrl(path);

    if (checked.has(url)) continue; // Skip if already processed
    checked.add(url);

    const priority = getPriority(path);
    const lastModified = await getLastModifiedDate(`./${path}`);

    if (lastModified && lastModified > mostRecent) {
      mostRecent = lastModified;
    }

    paths.push(
      h('url', [h('loc', url), h('priority', priority), h('lastmod', lastModified?.toISOString())]),
    );
  }

  const sitemap = h('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' }, ...paths);

  const xml = await prettier.format(`<?xml version="1.0" encoding="utf-8"?>\n${toHtml(sitemap)}`, {
    parser: 'html',
    printWidth: 100,
    tabWidth: 2,
    htmlWhitespaceSensitivity: 'ignore',
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': Buffer.byteLength(xml).toString(),
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Last-Modified': mostRecent.toUTCString(),
      'X-Robots-Tag': 'all',
      ETag: `W/"${mostRecent.getTime()}"`,
    },
  });
};
