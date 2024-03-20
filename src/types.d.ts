type Markdown = {
	default: ComponentType<SvelteComponent>;
	metadata: Record<string, unknown>;
};

declare module '*.md' {
	const SvelteComponent: import('svelte').SvelteComponent;
	const CompnentType: import('svelte').ComponentType;
	export default ComponentType<SvelteComponent>;
	export const metadata: Record<string, unknown>;
}

declare module 'mdsvex-relative-images';
declare module '@jsdevtools/rehype-toc';
declare module 'remark-obsidian';
