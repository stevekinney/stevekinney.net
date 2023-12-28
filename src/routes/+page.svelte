<script lang="ts">
	import metadata from '$lib/metadata';
	import Biography from './biography.md';
</script>

<svelte:head>
	<title>{metadata.title}</title>
	<meta name="description" content={metadata.description} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={metadata.title} />
	<meta property="og:description" content={metadata.description} />
	<meta property="og:url" content={metadata.url} />
</svelte:head>

<div class="space-y-8">
	<enhanced:img
		src="./self-portrait.jpg?w=736;768"
		sizes="(min-width: 640px) 768px, 736px"
		class="aspect-[3/4] max-w-full rounded-md shadow-lg sm:float-right sm:ml-8 sm:w-72 md:w-96"
		alt="Steve Kinney"
	/>
	<Biography />
</div>
