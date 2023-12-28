<script lang="ts">
	import PostLink from '$lib/components/post-link.svelte';

	export let data;
</script>

<div class="grid grid-cols-1 gap-10 lg:grid-cols-4">
	<ul class="order-1 flex flex-col gap-8">
		<h2 class="text-lg font-bold">Further Reading</h2>
		{#each data.posts as post}
			<PostLink {post} as="li" />
		{/each}
	</ul>
	<div class="lg:col-span-3">
		<slot />
	</div>
</div>
