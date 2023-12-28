import satori from 'satori';
import { readFile } from 'fs/promises';
import { getPost } from '$lib/posts.js';
import { error } from '@sveltejs/kit';

import SocialCard from './social-card';

export const prerender = true;

const fontData: ArrayBuffer = await readFile('src/routes/assets/[slug].svg/roboto.ttf');

const headers = {
	'content-type': 'image/svg+xml'
};

export async function GET({ params, request }) {
	const { meta: post } = await getPost(params.slug).catch(() => {
		throw error(404, `Could not find ${params.slug}`);
	});

	const svg = await satori(SocialCard({ post, request }), {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: 'Roboto',
				data: fontData,
				weight: 400,
				style: 'normal'
			}
		]
	});
	return new Response(svg, { headers });
}
