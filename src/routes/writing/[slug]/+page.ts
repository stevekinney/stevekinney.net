import type { Post } from '$lib/types.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		const post = await import(`../../../writing/${params.slug}.md`);

		return {
			content: post.default,
			meta: post.metadata as Post,
			slug: params.slug
		};
	} catch (e) {
		throw error(404, `Could not find ${params.slug}`);
	}
}
