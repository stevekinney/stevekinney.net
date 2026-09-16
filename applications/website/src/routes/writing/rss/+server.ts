import { createHash } from 'node:crypto';

import { author, description as siteDescription, title as siteTitle, url } from '$lib/metadata';
import { getPostIndex } from '$lib/server/content';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

export const prerender = true;
const now = new Date();

export async function GET() {
  const posts = getPostIndex();
  const updated = posts.reduce((latest, post) => {
    const effective = new Date(post.modified ?? post.date);
    return effective > latest ? effective : latest;
  }, new Date(0));

  const entries = posts.map(({ slug, title, date, description, modified }) => {
    const effectiveModified = modified ?? date;
    return h('entry', [
      h('title', title),
      h('summary', description),
      h('link', { type: 'text/html', href: `${url}/writing/${slug}` }),
      h('id', `${url}/writing/${slug}`),
      h('published', new Date(date).toISOString()),
      h('updated', new Date(effectiveModified).toISOString()),
      h('author', [h('name', author), h('uri', url)]),
    ]);
  });

  const feed = h('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
    h('title', siteTitle),
    h('subtitle', siteDescription),
    h('author', [h('name', author)]),
    h('id', `${url}/writing/rss`),
    h('link', { type: 'text/html', href: url }),
    h('updated', updated.toISOString()),
    h('rights', `Copyright © ${now.getFullYear()}, ${siteTitle}`),
    ...entries,
  ]);

  const xml = await prettier.format(`<?xml version="1.0" encoding="utf-8"?>\n${toHtml(feed)}`, {
    parser: 'html',
    printWidth: 100,
    tabWidth: 2,
    htmlWhitespaceSensitivity: 'ignore',
  });

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
      'Last-Modified': updated.toUTCString(),
      'X-Robots-Tag': 'all',
      'Content-Length': Buffer.byteLength(xml).toString(),
      ETag: `"${createHash('sha256').update(xml).digest('hex')}"`,
    },
  });
}
