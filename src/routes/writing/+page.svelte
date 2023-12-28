<script lang="ts">
	import Card from '$lib/components/card.svelte';

	export let data;
</script>

<section>
	<ul class="posts grid grid-cols-1 gap-8 lg:grid-cols-3">
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
