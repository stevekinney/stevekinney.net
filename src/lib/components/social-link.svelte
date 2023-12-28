<script lang="ts">
	import type { ComponentType, SvelteComponent } from 'svelte';

	export let href: string;
	export let icon: ComponentType<SvelteComponent>;
</script>

<a {href} target="_blank">
	<svelte:component
		this={icon}
		class="transition-colors hover:stroke-purple-700 active:stroke-purple-600"
		size={36}
		aria-label={icon.name}
	/>
</a>
