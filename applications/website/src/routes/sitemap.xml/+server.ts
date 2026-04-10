import {
  listCourseMarkdownModulePaths,
  listWritingMarkdownModulePaths,
} from '$lib/content-modules';
import { getLastModifiedDate } from '$lib/get-last-modified-date';
import metadata from '$lib/metadata';
import type { Element } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

export const prerender = true;

const dynamicRoute = /\[\w+\]/;

const getPriority = (filePath: string): number => {
  if (filePath.endsWith('/README.md')) return 0.8;
  if (filePath.includes('/writing/')) return 0.7;
  if (filePath.includes('/courses/')) return 0.6;

  if (filePath.startsWith('/src/routes/')) {
    const depth = filePath.split('/').length - 4;
    return 1.0 - depth * 0.1; // Decrease priority based on depth
  }

  return 0.5;
};

const getUrlPath = (filePath: string): string | null => {
  if (filePath.startsWith('/src/routes/')) {
    const routePath = filePath
      .replace('/src/routes', '')
      .replace('/+page', '')
      .replace('.svelte', '')
      .replace('.md', '');
    return routePath || '/';
  }

  const writingMatch = filePath.match(/(?:^|\/)content\/writing\/([^/]+)\.md$/);
  if (writingMatch) {
    return `/writing/${writingMatch[1]}`;
  }

  const courseMatch = filePath.match(/(?:^|\/)courses\/([^/]+)\/([^/]+)\.md$/);
  if (courseMatch) {
    const [, courseSlug, lessonSlug] = courseMatch;
    if (lessonSlug === '_index') return null;
    if (lessonSlug === 'README') return `/courses/${courseSlug}`;
    return `/courses/${courseSlug}/${lessonSlug}`;
  }

  return null;
};

const toGitPath = (filePath: string): string | null => {
  if (filePath.startsWith('/src/routes/')) {
    return `applications/website${filePath}`;
  }

  const writingMatch = filePath.match(/(?:^|\/)(content\/writing\/[^/]+\.md)$/);
  if (writingMatch) return writingMatch[1];

  const courseMatch = filePath.match(/(?:^|\/)(courses\/[^/]+\/[^/]+\.md)$/);
  if (courseMatch) return courseMatch[1];

  return null;
};

export const GET = async () => {
  const checked: Set<string> = new Set();
  const paths: Element[] = [];
  let mostRecent = new Date(0);

  const filePaths = [
    Object.keys(import.meta.glob('/src/routes/**/+page.{md,svelte}')),
    listWritingMarkdownModulePaths(),
    listCourseMarkdownModulePaths(),
  ].flat();

  for (const filePath of filePaths) {
    if (filePath.startsWith('/src/routes/') && dynamicRoute.test(filePath)) continue;
    if (filePath.includes('_index')) continue;

    const routePath = getUrlPath(filePath);
    if (!routePath) continue;
    const url = `${metadata.url}${routePath}`;

    if (checked.has(url)) continue; // Skip if already processed
    checked.add(url);

    const priority = getPriority(filePath);
    const gitPath = toGitPath(filePath);
    const lastModified = gitPath ? await getLastModifiedDate(gitPath) : null;

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
