<script>
	import courses from '$lib/courses';
	import Card from '$lib/components/card.svelte';
	import Description from './description.md';
</script>

<section class="space-y-8">
	<h2 class="text-xl font-bold">
		<a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">
			Courses on <span>Frontend Masters</span>
		</a>
	</h2>

	<Description />

	<ul class="grid gap-10 lg:grid-cols-3">
		{#each courses as course}
			<Card title={course.title} description={course.description} url={course.href} as="li" />
		{/each}
	</ul>
</section>
