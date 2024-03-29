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

declare module 'remark-obsidian';
