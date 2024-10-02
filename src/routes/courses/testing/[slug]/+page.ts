import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
	const { slug } = params;
	const { pathname } = url;

	const post = await import(`../../../../../content/courses/testing/${slug}.md`).catch(() => {
		error(404, 'Not found');
	});

	const meta = post.metadata as Post;

	return {
		content: post.default,
		meta,
		slug,
		pathname,
	};
}
