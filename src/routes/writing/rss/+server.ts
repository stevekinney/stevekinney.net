import { title, description, url, author } from '$lib/metadata';
import { getPosts } from '$lib/posts';

const now = new Date();

export async function GET() {
	const headers = { 'Content-Type': 'application/xml' };
	const posts = await getPosts();
	const [first] = posts;

	const entries = posts
		.map(({ slug, title, date, description, modified }) =>
			`
			<entry>
				<title>${title}</title>
				<summary>${description}</summary>
				<link type="text/html" href="${url}/writing/${slug}" />
				<id>${url}/writing/${slug}</id>
				<published>${new Date(date).toISOString()}</published>
				<updated>${new Date(modified).toISOString()}</updated>
				<author>
					<name>${author}</name>
					<uri>${url}</uri>
				</author>
			</entry>
		`.trim()
		)
		.join('\n')
		.trim();

	const xml = `
		<?xml version="1.0" encoding="UTF-8"?>
		<feed xmlns="http://www.w3.org/2005/Atom" rel="self">
				<title>${title}</title>
				<description>${description}</description>
				<id>${url}/writing/rss</id>
				<link type="text/html" href="${url}" />
				<updated>${new Date(first.date).toISOString()}</updated>
				<rights>Copyright © ${now.getFullYear()}, ${title}</rights>
				${entries}
		</feed>
	`.trim();

	return new Response(xml, { headers });
}
