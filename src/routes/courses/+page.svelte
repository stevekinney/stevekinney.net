<script>
	import courses from '$lib/courses';
	import Card from '$lib/components/card.svelte';

	export let data;
</script>

<section class="space-y-6">
	<h1 class="text-xl font-bold">
		<a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">
			Courses on <span>Frontend Masters</span>
		</a>
	</h1>

	<svelte:component this={data.description} />

	<ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
		{#each courses as course}
			<Card title={course.title} description={course.description} url={course.href} as="li" />
		{/each}
	</ul>
</section>
