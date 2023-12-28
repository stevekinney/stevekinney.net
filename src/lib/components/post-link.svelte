<script lang="ts">
	import { page } from '$app/stores';

	import type { Post } from '$lib/types';

	import Date from './date.svelte';
	import Link from './link.svelte';

	export let post: Post;
	export let as: keyof HTMLElementTagNameMap = 'div';

	$: href = `/writing/${post.slug}`;
	$: active = $page.url.pathname === href;
</script>

<svelte:element this={as} class="group flex flex-wrap items-center gap-1">
	<Date date={post.date} />
	<Link {href} class="underline-offset-4` decoration-2">
		{post.title}
	</Link>
</svelte:element>
