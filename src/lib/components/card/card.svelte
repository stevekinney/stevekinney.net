<script lang="ts">
	import { variants, type CardVariants } from './variants';

	interface Props {
		variant?: CardVariants['variant'];
		as?: 'div' | 'section' | 'aside' | 'article' | 'li';
		children?: import('svelte').Snippet;
	}

	let { variant = 'default', as = 'div', children }: Props = $props();

	const children_render = $derived(children);
</script>

<svelte:element this={as} class={variants({ variant })}>
	{@render children_render?.()}
</svelte:element>
