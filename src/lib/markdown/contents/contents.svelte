<script context="module">
	import A from './a.svelte';
	import H2 from './h2.svelte';
	import UL from './ul.svelte';

	export { A as a, H2 as h2, UL as ul };
</script>

<script>
	import { twMerge as merge } from 'tailwind-merge';
	import { toDataAttributes } from '$lib/to-data-attributes';

	/** @type {string} */
	export let as = 'nav';

	/** @type {string | undefined | null} */
	let className;

	export { className as class };
</script>

<svelte:element this={as} class={merge(className)} {...toDataAttributes($$restProps)}>
	<slot />
</svelte:element>
