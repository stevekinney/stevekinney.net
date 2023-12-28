<script>
	import courses from '$lib/courses';
	import metadata from '$lib/metadata';
	import Card from '$lib/components/card.svelte';
	import Description from './description.md';
</script>

<svelte:head>
	<title>Writing — {metadata.title}</title>
	<meta
		name="description"
		content="A list of courses that Steve has taught with Frontend Masters."
	/>
</svelte:head>

<section class="space-y-6">
	<h2 class="text-xl font-bold">
		<a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">
			Courses on <span>Frontend Masters</span>
		</a>
	</h2>

	<Description />

	<ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
		{#each courses as course}
			<Card title={course.title} description={course.description} url={course.href} as="li" />
		{/each}
	</ul>
</section>
