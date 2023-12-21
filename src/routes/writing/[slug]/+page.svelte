<script lang="ts">
	export let data;
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta property="og:type" content="article" />
	<meta property="og:title" content={data.meta.title} />
</svelte:head>

<article>
	<hgroup>
		<h1>{data.meta.title}</h1>
	</hgroup>

	<div class="prose">
		<svelte:component this={data.content} />
	</div>
</article>
