<script lang="ts">
	import Card from '$lib/components/card.svelte';
	import Description from './description.md';

	export let data;
</script>

<section class="space-y-6">
	<h2 class="text-xl font-bold">Written Words</h2>

	<Description />

	<ul class="posts grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.posts as post}
			<Card
				title={post.title}
				description={post.description}
				url="/writing/{post.slug}"
				date={post.date}
				as="li"
			/>
		{/each}
	</ul>
</section>
