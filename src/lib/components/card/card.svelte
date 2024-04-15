<script lang="ts">
	import { variants, type CardVariants } from './variants';

	export let variant: CardVariants['variant'] = 'default';
	export let as: 'div' | 'section' | 'aside' | 'article' | 'li' = 'div';
</script>

<svelte:element this={as} class={variants({ variant })}>
	<slot />
</svelte:element>
