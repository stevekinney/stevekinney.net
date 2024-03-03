---
title: Writing
description: A relatively small collection of things that Steve has managed to sit down an type out.
layout: page
date: 2023-12-27T19:32:52-07:00
modified: 2023-12-31T10:21:58-07:00
---

<script lang="ts">
	import DateTime from '$lib/components/date.svelte';

	export let data;
</script>

I write a lot of words, but most of them are for the [courses](/courses) that I teach with my buddies at [Frontend Masters](https://frontendmasters.com) or in some other pseudo-professional capacity. That said I've occasionally mustered up the will power and discipline to write a few words that I'm _not_ being paid for. This is a complete—if underwhelming—list. I fully intend to start writing more in the future—but, we'll see how that goes.

<ul class="space-y-8 not-prose">
	{#each data.posts as post}
	<li>
		<a href="/writing/{post.slug}" class="group">
			<div class="flex sm:gap-4 sm:items-center justify-between flex-col sm:flex-row">
			<h3 class="font-bold sm:text-xl underline decoration-primary-200 decoration-4 group-hover:decoration-primary-500">{post.title}</h3>
			<DateTime date={post.date} />
			</div>
			<p>{post.description}</p>
		</a>
	</li>
	{/each}
</ul>
