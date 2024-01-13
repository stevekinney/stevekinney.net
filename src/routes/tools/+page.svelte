<script>
	import Card from '$lib/components/card.svelte';

	export let data;
</script>

<section class="space-y-6">
	<h1 class="text-xl font-bold">Tools</h1>

	<svelte:component this={data.content} />

	<ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.tools as tool}
			<Card title={tool.title} description={tool.description} url={tool.href} as="li" />
		{/each}
	</ul>
</section>
