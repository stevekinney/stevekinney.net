<script>
	import Card from '$lib/components/card.svelte';
	import courses from '$lib/courses';
</script>

<section>
	<h2 class="mb-8 text-xl font-bold">
		<a href="https://frontendmasters.com/teachers/steve-kinney/" target="_blank">
			Courses on <span>Frontend Masters</span>
		</a>
	</h2>

	<ul class="grid gap-10 lg:grid-cols-3">
		{#each courses as course}
			<Card title={course.title} description={course.description} url={course.href} as="li" />
		{/each}
	</ul>
</section>
