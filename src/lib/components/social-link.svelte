<script lang="ts">
	import type { ComponentType, SvelteComponent } from 'svelte';
	import { twMerge as merge } from 'tailwind-merge';

	export let href: string;
	export let icon: ComponentType<SvelteComponent>;

	let className: string = '';
	export { className as class };
</script>

<a {href} target="_blank">
	<svelte:component
		this={icon}
		class={merge('hover:stroke-primary-700 active:stroke-primary-600 transition-colors', className)}
		size={36}
		aria-label={icon.name}
	/>
</a>
