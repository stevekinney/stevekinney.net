type Section = {
	title: string;
	slug: string;
	bonus?: boolean;
};

const index: Readonly<Section[]> = [
	{ title: 'Getting Started', slug: 'getting-started' },
	{ title: 'Aligning Objects', slug: 'aligning-objects' },
	{ title: 'Working with Layers', slug: 'layers' },
	{ title: 'Working with Text', slug: 'text' },
	{ title: 'Selecting and Inspecting', slug: 'selecting-and-inspecting' },
	{ title: 'Constraints', slug: 'constraints' },
	{ title: 'Layout Grids', slug: 'layout-grids' },
	{ title: 'Auto Layout', slug: 'auto-layout' },
	{ title: 'Shared Styles', slug: 'shared-styles' },
	{ title: 'Variables', slug: 'variables' },
	{ title: 'Components', slug: 'components' },
	{ title: 'Variants', slug: 'variants' },
	{ title: 'Interactive Components', slug: 'interactive-components' },
	{ title: 'Dev Mode', slug: 'dev-mode' },
	{ title: 'Prototyping', slug: 'prototyping' },
	{ title: 'Libraries', slug: 'libraries' },
	{ title: 'Widget API', slug: 'widget-api' },
	{ title: 'Plugin API', slug: 'plugin-api' },
	{ title: 'Developer Resources API', slug: 'developer-resources-api' },
	{ title: 'REST API', slug: 'rest-api' },
	{ title: 'Branching and Merging', slug: 'branching-and-merging', bonus: true },
] as const;

export default index;
