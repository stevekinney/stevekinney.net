import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const { slug } = params;

	const post = await import(`../../../../courses/figma/${slug}.md`).catch(() => {
		error(404, 'Not found');
	});

	const meta = post.metadata as Post;

	return {
		content: post.default,
		meta,
		slug,
	};
}
