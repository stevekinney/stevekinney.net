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
	class="border-primary-200 bg-primary-100 dark:border-primary-900 dark:bg-primary-800 my-10 rounded-md border-2 px-8 py-4"
>
	<p>
		See something that looks a little off? Feel free to <a
			href="https://github.com/stevekinney/stevekinney.net/tree/main/src/writing/{data.slug}.md"
			class="decoration-primary-500 font-semibold underline decoration-2 underline-offset-4"
			>open a pull request here</a
		>.
	</p>
</footer>
