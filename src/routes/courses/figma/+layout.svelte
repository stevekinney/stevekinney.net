<script lang="ts">
	import Index from '$courses/figma/README.md';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const children_render = $derived(children);
</script>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_fit-content(12rem)]">
	<div>
		{@render children_render?.()}
	</div>
	<Index />
</div>
