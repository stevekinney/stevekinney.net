<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	const { children }: Props = $props();
</script>

<header class="flex items-center justify-between">
	<a href="/courses/full-stack-typescript" class=" block text-primary-600 dark:text-primary-200">
		Full-Stack TypeScript
	</a>
</header>

{@render children?.()}
