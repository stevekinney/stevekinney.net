import satori from 'satori';
import OpenGraphImage from './open-graph-image';

export const prerender = false;

const headers = {
	'Content-Type': 'image/svg+xml',
	'Cache-Control': 'max-age=604800, stale-while-revalidate=86400',
};

export async function GET(handler) {
	const { fetch } = handler;

	const firaSans = await fetch('/fira-sans-500-normal.woff').then((res) => res.arrayBuffer());
	const firaSansThin = await fetch('/fira-sans-300-normal.woff').then((res) => res.arrayBuffer());
	const leagueGothic = await fetch('/league-gothic-400-normal.woff').then((res) =>
		res.arrayBuffer(),
	);

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
