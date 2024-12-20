---
title: Tools
layout: page
description: A collection of little tools and utilities that Steve has made along the way.
---

<script>
	import Card from '$lib/components/card';

	export let data;
</script>

Below is a list of little tools and utilities that I have created along my various adventures.

<ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 not-prose">
	{#each data.tools as tool}
		<Card title={tool.title} description={tool.description} url={tool.href} as="li" />
	{/each}
</ul>
