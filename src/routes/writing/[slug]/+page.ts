import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	try {
		return getPost(params.slug);
	} catch (e) {
		throw error(404, `Could not find ${params.slug}`);
	}
}
