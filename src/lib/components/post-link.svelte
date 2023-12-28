<script lang="ts">
	import { page } from '$app/stores';

	import type { Post } from '$lib/types';

	import Date from './date.svelte';

	export let post: Post;
	export let as: keyof HTMLElementTagNameMap = 'div';

	$: href = `/writing/${post.slug}`;
	$: active = $page.url.pathname === href;
</script>

<svelte:element this={as} class="group flex flex-wrap items-center gap-1">
	<Date date={post.date} />
	<a
		{href}
		class="font-semibold group-hover:text-purple-900 dark:group-hover:text-purple-100"
		class:active
	>
		{post.title}
	</a>
</svelte:element>

<style lang="postcss">
	.active {
		@apply underline decoration-purple-700 decoration-2 underline-offset-2;
	}
</style>
