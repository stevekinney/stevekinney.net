import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	return getPost(params.slug).catch(() => {
		error(404, `Not found`);
	});
}
