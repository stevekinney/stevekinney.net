declare module '*.md' {
	const SvelteComponent: import('svelte').SvelteComponent;
	const CompnentType: import('svelte').ComponentType;
	export default ComponentType<SvelteComponent>;
}
