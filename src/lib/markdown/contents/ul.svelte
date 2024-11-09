<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
	const children_render = $derived(children);

</script>

<ul class="mb-8 space-y-1">{@render children_render?.()}</ul>
