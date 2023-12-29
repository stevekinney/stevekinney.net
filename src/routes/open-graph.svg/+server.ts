import satori from 'satori';
import { getFont } from '$lib/fonts';

import OpenGraphImage from './open-graph-image';

const headers = {
	'Content-Type': 'image/svg+xml',
	'Cache-Control': 'max-age=604800, stale-while-revalidate=86400',
};

const firaSans = await getFont('fira-sans', 500, 'normal');
const firaSansThin = await getFont('fira-sans', 300, 'normal');
const leagueGothic = await getFont('league-gothic', 400, 'normal');

export async function GET(handler) {
	const svg = await satori(OpenGraphImage(handler), {
		width: 1200,
		height: 630,
		fonts: [firaSans, firaSansThin, leagueGothic],
	});

	return new Response(svg, { headers });
}
