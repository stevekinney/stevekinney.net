<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
	const children_render = $derived(children);

</script>

<h2 class="mb-2 text-lg font-bold">{@render children_render?.()}</h2>
