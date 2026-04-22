import { stat } from 'node:fs/promises';
import path from 'node:path';

import { getGeneratedContent } from '$lib/server/content';
import metadata from '$lib/metadata';
import type { Element } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

export const prerender = true;

const dynamicRoute = /\[\w+\]/;

const getStaticPriority = (filePath: string): number => {
  if (filePath.startsWith('/src/routes/')) {
    const depth = filePath.split('/').length - 4;
    return 1.0 - depth * 0.1;
  }

  return 0.5;
};

const getUrlPath = (filePath: string): string | null => {
  const routePath = filePath
    .replace('/src/routes', '')
    .replace('/+page', '')
    .replace('.svelte', '')
    .replace('.md', '');

  return routePath || '/';
};

const getStaticLastModified = async (filePath: string): Promise<Date | null> => {
  try {
    const file = await stat(path.resolve(process.cwd(), filePath.replace(/^\//, '')));
    return file.mtime;
  } catch {
    return null;
  }
};

export const GET = async () => {
  const checked: Set<string> = new Set();
  const paths: Element[] = [];
  let mostRecent = new Date(0);

  const pageFiles = Object.keys(import.meta.glob('/src/routes/**/+page.{md,svelte}'));

  for (const filePath of pageFiles) {
    if (dynamicRoute.test(filePath)) continue;
    if (filePath.includes('_index')) continue;

    const routePath = getUrlPath(filePath);
    if (!routePath) continue;

    const url = `${metadata.url}${routePath}`;
    if (checked.has(url)) continue;
    checked.add(url);

    const lastModified = await getStaticLastModified(filePath);
    if (lastModified && lastModified > mostRecent) {
      mostRecent = lastModified;
    }

    paths.push(
      h('url', [
        h('loc', url),
        h('priority', getStaticPriority(filePath)),
        h('lastmod', lastModified?.toISOString()),
      ]),
    );
  }

  for (const route of Object.values(getGeneratedContent().routes)) {
    const url = `${metadata.url}${route.path}`;
    if (checked.has(url)) continue;
    checked.add(url);

    const lastModified = new Date(route.modified || route.date);
    if (!Number.isNaN(lastModified.getTime()) && lastModified > mostRecent) {
      mostRecent = lastModified;
    }

    const priority =
      route.contentType === 'course' ? 0.8 : route.contentType === 'writing' ? 0.7 : 0.6;

    paths.push(
      h('url', [h('loc', url), h('priority', priority), h('lastmod', lastModified.toISOString())]),
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
