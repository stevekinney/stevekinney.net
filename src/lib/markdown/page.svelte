<script>
	import SEO from '$lib/components/seo.svelte';
	import { toDataAttributes } from '$lib/to-data-attributes';

	/** @type {string} */
	export let title;

	/** @type {string} */
	export let description;

	/** @type {boolean} */
	export let published = true;

	/** @type {Date | string | undefined} */
	export let date = undefined;

	/** @type {Date | string | undefined} */
	export let modified = undefined;

	/** @type {string | undefined | null} */
	let className = '';
	export { className as class };
</script>

<SEO {title} {description} {published} {date} {modified} />

<div class={className} {...toDataAttributes($$restProps)}>
	<h1 class="mb-6 text-4xl font-bold">{title}</h1>

	<article class="prose max-w-none dark:prose-invert">
		<slot />
	</article>
</div>
