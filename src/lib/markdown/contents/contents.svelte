<script module>
	import A from './a.svelte';
	import H2 from './h2.svelte';
	import UL from './ul.svelte';

	export { A as a, H2 as h2, UL as ul };
</script>

<script>
	import { merge } from '$merge';
	import { toDataAttributes } from '$lib/to-data-attributes';

	/** @type {string | undefined | null} */
	/**
	 * @typedef {Object} Props
	 * @property {string} [as]
	 * @property {string} [class]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	const { as = 'nav', class: className = '', children, ...rest } = $props();
</script>

<svelte:element this={as} class={merge(className)} {...toDataAttributes(rest)}>
	{@render children?.()}
</svelte:element>
