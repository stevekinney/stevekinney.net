import type { RequestEvent } from '@sveltejs/kit';

import metadata from '$lib/metadata';

export function h(type: string, props: { [key: string]: unknown } | null, ...children: unknown[]) {
	if (children.length) {
		props = props || {};
		props.children = children;
	}

	return { type, props: props || {} };
}

const OpenGraphImage = ({ url }: RequestEvent) => {
	let title: string | undefined = metadata.title;
	let description = metadata.description;

	if (url.searchParams.has('title')) {
		title = decodeURIComponent(url.searchParams.get('title')!);
	}

	if (url.searchParams.has('description')) {
		description = decodeURIComponent(url.searchParams.get('description')!);
	}

	if (!title && !description) {
		description = metadata.description;
	}

	return (
		<div
			style={{
				display: 'flex',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100vw',
					height: '100vh',
					padding: '4rem',
					gap: '2rem',
					backgroundImage:
						'radial-gradient(circle at 25px 25px, #8a55c8 2%, transparent 0%), radial-gradient(circle at 75px 75px, #8a55c8 2%, transparent 0%), linear-gradient(to right, #643a8f, #d5c2f0)',
					color: 'black',
					backgroundSize: '100px 100px, 100px 100px, 100% 100%',
					backgroundColor: 'white',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: title ? 'flex-start' : 'center',
						gap: '2rem',
						flexGrow: 1,
						height: '60vh',
					}}
				>
					<h2
						style={{
							fontSize: description ? '3rem' : '6rem',
							textAlign: description ? 'left' : 'center',
							margin: 0,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{title}
					</h2>
					<p
						style={{
							fontSize: '2rem',
							fontWeight: 300,
							margin: 0,
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{description}
					</p>
				</div>
				<div style={{ display: 'flex', justifyContent: 'space-between' }}>
					<p style={{ fontSize: '2rem', margin: 0 }}>@stevekinney</p>
					<p style={{ fontSize: '2rem', margin: 0 }}>https://stevekinney.net</p>
				</div>
			</div>
		</div>
	);
};

export default OpenGraphImage;
