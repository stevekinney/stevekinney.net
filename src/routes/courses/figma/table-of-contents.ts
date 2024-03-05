type Section = {
	title: string;
	slug: string;
	bonus?: boolean;
};

const index: Readonly<Section[]> = [
	{ title: 'Getting Started', slug: 'getting-started' },
	{ title: 'Aligning Objects', slug: 'aligning-objects' },
	{ title: 'Working with Layers', slug: 'layers' },
	{ title: 'Selecting and Inspecting', slug: 'selecting-and-inspecting' },
	{ title: 'Constraints', slug: 'constraints' },
	{ title: 'Layout Grids', slug: 'layout-grids' },
	{ title: 'Auto Layout', slug: 'auto-layout' },
	{ title: 'Styles', slug: 'styles' },
	{ title: 'Typography', slug: 'typography' },
	{ title: 'Variables', slug: 'variables' },
	{ title: 'Components', slug: 'components' },
	{ title: 'Component Properties', slug: 'component-properties' },
	{ title: 'Variants', slug: 'variants' },
	{ title: 'Base Components', slug: 'base-components' },
	{ title: 'Placeholder Components', slug: 'placeholder-components' },
	{ title: 'Cropped Grid Components', slug: 'cropped-grid-components' },
	{ title: 'Interactive Components', slug: 'interactive-components' },
	{
		title: 'Variants and Variable Modes for Responsive Text',
		slug: 'variables-variants-responsive-text',
	},
	{ title: 'Prototyping', slug: 'prototyping' },
	{ title: 'Dev Mode', slug: 'dev-mode' },
] as const;

export default index;
