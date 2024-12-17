<script lang="ts" module>
	import type { BaseAttributes } from '../component.types';
	import { variants, type CardVariants } from './variants';

	type ValidElements = 'div' | 'section' | 'aside' | 'article' | 'li';

	export type CardProps = BaseAttributes &
		CardVariants & {
			as?: ValidElements;
		};
</script>

<script lang="ts">
	let { variant = 'default', as = 'div', children }: CardProps = $props();
</script>

<svelte:element this={as} class={variants({ variant })}>
	{@render children?.()}
</svelte:element>
