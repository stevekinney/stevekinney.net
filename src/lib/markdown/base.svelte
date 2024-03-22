<script>
	import { toDataAttributes } from '$lib/to-data-attributes';

	/** @type {string} */
	export let as = 'section';

	/** @type {string | undefined | null} */
	let className;

	export { className as class };
</script>

<svelte:element this={as} class={className} {...toDataAttributes($$restProps)}>
	<slot />
</svelte:element>
