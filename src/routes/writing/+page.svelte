<script lang="ts">
	export let data;
</script>

<section>
	<ul class="posts">
		{#each data.posts as post}
			<li class="post">
				<a href="/writing/{post.slug}" class="title">{post.title}</a>
				<p class="description">{post.description}</p>
			</li>
		{/each}
	</ul>
</section>
