import { author, description as siteDescription, title as siteTitle, url } from '$lib/metadata';
import { getPosts } from '$lib/posts';
import { toHtml } from 'hast-util-to-html';
import { h } from 'hastscript';
import prettier from 'prettier';

export const prerender = true;
const now = new Date();

export async function GET() {
	const posts = await getPosts();
	const [first] = posts;
	const updated = new Date(first.date);

	const entries = posts.map(({ slug, title, date, description, modified }) => {
		return h('entry', [
			h('title', title),
			h('summary', description),
			h('link', { type: 'text/html', href: `${url}/writing/${slug}` }),
			h('id', `${url}/writing/${slug}`),
			h('published', new Date(date).toISOString()),
			h('updated', new Date(modified).toISOString()),
			h('author', [h('name', author), h('uri', url)]),
		]);
	});

	const feed = h('feed', { xmlns: 'http://www.w3.org/2005/Atom' }, [
		h('title', siteTitle),
		h('subtitle', siteDescription),
		h('author', [h('name', author)]),
		h('id', `${url}/writing/rss`),
		h('link', { type: 'text/html', href: url }),
		h('updated', new Date(first.date).toISOString()),
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
			'Content-Type': 'application/rss+xml',
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Access-Control-Allow-Origin': '*',
			'Last-Modified': updated.toUTCString(),
			'X-Robots-Tag': 'all',
			'Content-Length': Buffer.byteLength(xml).toString(),
			ETag: `W/"${updated.getTime()}"`,
		},
	});
}
