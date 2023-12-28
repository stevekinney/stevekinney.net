<script lang="ts">
	import type { Post } from '$lib/types';

	import Date from './date.svelte';
	import Link from './link.svelte';

	export let post: Post;
	export let as: keyof HTMLElementTagNameMap = 'div';

	$: href = `/writing/${post.slug}`;
</script>

<svelte:element this={as} class="group flex flex-wrap items-center gap-1">
	<Date date={post.date} />
	<Link {href} class="decoration-purple-400 decoration-2 underline-offset-4">
		{post.title}
	</Link>
</svelte:element>
