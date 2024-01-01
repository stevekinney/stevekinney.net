<script>
	import ShikiThemeCreator from './shiki-theme-editor.svelte';
	export let data;
</script>

<div class="space-y-10">
	<h1 class="text-2xl font-bold">{data.meta.title}</h1>

	<svelte:component this={data.content} />

	<ShikiThemeCreator />
</div>
