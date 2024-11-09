<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<header>
	<h2>
		<a href="/courses/figma" class=" text-primary-600 dark:text-primary-200">
			Figma for Developers
		</a>
	</h2>
</header>

{@render children?.()}
