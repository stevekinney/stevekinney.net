<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { Icon } from 'lucide-svelte';
	import { twMerge as merge } from 'tailwind-merge';

	export let href: string;
	export let icon: ComponentType<Icon>;
	export let name = icon.name;

	let className: string = '';
	export { className as class };
</script>

<a {href} target="_blank">
	<svelte:component
		this={icon}
		class={merge('transition-colors hover:stroke-primary-700 active:stroke-primary-600', className)}
		size={36}
		aria-label={name}
	/>
</a>
