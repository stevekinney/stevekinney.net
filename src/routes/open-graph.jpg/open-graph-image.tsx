import type { RequestEvent } from '@sveltejs/kit';

import metadata from '$lib/metadata';

export function h(type: string, props: { [key: string]: unknown } | null, ...children: unknown[]) {
	if (children.length) {
		props = props || {};
		props.children = children;
	}

	return { type, props: props || {} };
}

const MAX_DESCRIPTION_LENGTH = 200;
const MAX_TITLE_LENGTH = 150;

const OpenGraphImage = ({ url }: RequestEvent) => {
	let title: string | undefined;
	let description;

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
				flexDirection: 'column',
				width: '100vw',
				height: '100vh',
				padding: '4rem 10rem',
				gap: '2rem',
				backgroundColor: 'white',
				backgroundPosition: 'center, 100% center',
				color: 'black',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: title ? 'flex-start' : 'center',
					gap: '2rem',
					flexGrow: 1,
				}}
			>
				{title && (
					<h2
						style={{
							fontSize: description ? '3rem' : '6rem',
							textAlign: description ? 'left' : 'center',
							width: '100%',
							margin: 0,
						}}
					>
						{title.length > MAX_TITLE_LENGTH ? `${title.slice(0, MAX_TITLE_LENGTH)}…` : title}
					</h2>
				)}
				{description && (
					<p
						style={{
							fontSize: '2rem',
							fontWeight: 300,
							margin: 0,
							overflow: 'hidden',
							maxHeight: '250px',
							textOverflow: 'ellipsis',
						}}
					>
						{description.length > MAX_DESCRIPTION_LENGTH
							? `${description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
							: description}
					</p>
				)}
			</div>
			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<p style={{ fontSize: '2rem', margin: 0 }}>@stevekinney</p>
				<p style={{ fontSize: '2rem', margin: 0 }}>https://stevekinney.net</p>
			</div>
		</div>
	);
};

export default OpenGraphImage;
