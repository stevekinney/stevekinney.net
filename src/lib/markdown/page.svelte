<script>
	/** @type {string} */
	export let title;
</script>

<h1 class="mb-6 text-xl font-bold">{title}</h1>

<article class="prose max-w-none dark:prose-invert">
	<slot />
</article>
