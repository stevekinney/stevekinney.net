import satori from 'satori';

export const prerender = false;

import OpenGraphImage from './open-graph-image';
import { readFile } from 'fs/promises';

const headers = {
	'Content-Type': 'image/svg+xml',
	'Cache-Control': 'max-age=604800, stale-while-revalidate=86400',
};

const firaSans = await readFile('src/routes/open-graph.svg/fira-sans-300-normal.woff');
const firaSansThin = await readFile('src/routes/open-graph.svg/fira-sans-500-normal.woff');
const leagueGothic = await readFile('src/routes/open-graph.svg/league-gothic-400-normal.woff');

export async function GET(handler) {
	const svg = await satori(OpenGraphImage(handler), {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: 'Fira Sans',
				weight: 300,
				style: 'normal',
				data: firaSansThin,
			},
			{
				name: 'Fira Sans',
				weight: 500,
				style: 'normal',
				data: firaSans,
			},
			{
				name: 'League Gothic',
				weight: 500,
				style: 'normal',
				data: leagueGothic,
			},
		],
	});

	return new Response(svg, { headers });
}
