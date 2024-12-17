type Post = {
	title: string;
	slug: string;
	description: string;
	date: string;
	modified: string;
	published: boolean;
};

declare module '*.md' {
	import type { SvelteComponent } from 'svelte';

	export default class Comp extends SvelteComponent {}

	export const metadata: Record<string, unknown>;
}

type Variant = import('./variants').Variant;
