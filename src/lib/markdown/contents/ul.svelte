<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<ul class="mb-8 space-y-1">{@render children?.()}</ul>
