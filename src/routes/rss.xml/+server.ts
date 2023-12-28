import { title, description, url } from '$lib/metadata';
import { getPosts } from '$lib/posts';

export async function GET() {
	const headers = { 'Content-Type': 'application/xml' };
	const posts = await getPosts();
	const entries = posts
		.map(({ slug, title, date, description }) =>
			`
			<entry>
				<title>${title}</title>
				<description>${description}</description>
				<link href="${url}/writing/${slug}" />
				<guid isPermaLink="true">${url}.net/writing/${slug}</guid>
				<pubDate>${new Date(date).toUTCString()}</pubDate>
			</entry>
		`.trim()
		)
		.join('\n')
		.trim();

	const xml = `
		<?xml version="1.0" encoding="UTF-8"?>
		<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
			<channel>
				<title>${title}</title>
				<description>${description}</description>
				<link>${url}</link>
				<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
				${entries}
			</channel>
		</rss>
	`.trim();

	return new Response(xml, { headers });
}
