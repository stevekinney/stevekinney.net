<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	const { children }: Props = $props();
</script>

<header>
	<h2>
		<a href="/courses/storybook" class=" text-primary-600 dark:text-primary-200">
			Building Design Systems with Storybook
		</a>
	</h2>
</header>

{@render children?.()}
