export async function load() {
	const readmes = import.meta.glob<Markdown>('./**/+page.{md,svelte}', { eager: true });

	const tools = Object.entries(readmes)
		.filter(([key, value]) => {
			if (key === './+page.md') return false;
			return value.metadata.title && value.metadata.description;
		})
		.map(([key, value]) => {
			const href = key.split('/')[1];
			return {
				href: '/tools/' + href,
				title: String(value.metadata.title),
				description: String(value.metadata.description),
			};
		});

	return { tools };
}
