<script lang="ts">
	import Date from '$lib/components/date.svelte';

	export let data;
</script>

<div class="space-y-10">
	<hgroup class="space-y-2">
		<Date date={data.meta.date} />
		<h1 class="text-2xl font-bold">{data.meta.title}</h1>
	</hgroup>

	<p class="font-serif text-2xl">
		{data.meta.description}
	</p>

	<svelte:component this={data.content} />
</div>

<footer
	class="my-10 rounded-md border-2 border-purple-200 bg-purple-100 px-8 py-4 dark:border-purple-900 dark:bg-purple-800"
>
	<p>
		See something that looks a little off? Feel free to <a
			href="https://github.com/stevekinney/stevekinney.net/tree/main/src/writing/{data.slug}.md"
			class="font-semibold underline decoration-purple-500 decoration-2 underline-offset-4"
			>open a pull request here</a
		>.
	</p>
</footer>
