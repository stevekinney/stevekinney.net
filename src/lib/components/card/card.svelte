<script lang="ts">
	import type { BaseAttributes } from '../component.types';
	import { variants, type CardVariants } from './variants';

	type ValidElements = 'div' | 'section' | 'aside' | 'article' | 'li';

	type Props = BaseAttributes &
		CardVariants & {
			as?: ValidElements;
		};

	let { variant = 'default', as = 'div', children }: Props = $props();
</script>

<svelte:element this={as} class={variants({ variant })}>
	{@render children?.()}
</svelte:element>
