<script lang="ts">
	import { variants, type CardVariants } from './variants';

	interface Props {
		variant?: CardVariants['variant'];
		as?: 'div' | 'section' | 'aside' | 'article' | 'li';
		children?: import('svelte').Snippet;
	}

	const { variant = 'default', as = 'div', children }: Props = $props();
</script>

<svelte:element this={as} class={variants({ variant })}>
	{@render children?.()}
</svelte:element>
