import { dev } from '$app/environment';
import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		return await getPost(params.slug);
	} catch (e) {
		if (dev) {
			console.error(`Error fetching post: ${params.slug}`, e);
		}

		return error(404, `Post not found`);
	}
}
