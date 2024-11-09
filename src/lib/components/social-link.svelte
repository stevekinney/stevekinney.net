<script lang="ts">
	import type { ComponentType } from 'svelte';
	import type { Icon } from 'lucide-svelte';
	import { twMerge as merge } from 'tailwind-merge';


	interface Props {
		href: string;
		icon: ComponentType<Icon>;
		name?: any;
		class?: string;
	}

	let {
		href,
		icon,
		name = icon.name,
		class: className = ''
	}: Props = $props();
	

	const SvelteComponent = $derived(icon);
</script>

<a {href} target="_blank">
	<SvelteComponent
		class={merge('transition-colors hover:stroke-primary-700 active:stroke-primary-600', className)}
		size={36}
		aria-label={name}
	/>
</a>
