<script>
	import { toDataAttributes } from '$lib/to-data-attributes';

	/** @type {string | undefined | null} */
	/**
	 * @typedef {Object} Props
	 * @property {string} [as]
	 * @property {string} [class]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { as = 'section', class: className = '', children, ...rest } = $props();
</script>

<svelte:element this={as} class={className} {...toDataAttributes(rest)}>
	{@render children?.()}
</svelte:element>
