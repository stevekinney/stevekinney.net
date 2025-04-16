---
title: Writing
description: A relatively small collection of things that Steve has managed to sit down an type out.
layout: page
date: 2023-12-27T19:32:52-07:00
modified: 2023-12-31T10:21:58-07:00
---

<script lang="ts">
	import { NotebookPen } from 'lucide-svelte';
	import DateTime from '$lib/components/date.svelte';

	export let data;
</script>

I write a lot of words, but most of them are for the [courses](/courses) that I teach with my buddies at [Frontend Masters](https://frontendmasters.com/?code=kinney&utm_source=kinney&utm_medium=social&utm_campaign=teacher_coupon) or in some other pseudo-professional capacity. That said, I've occasionally mustered up the will power and discipline to write a few words that I'm _not_ being paid for. This is a complete—if underwhelming—list. I fully intend to start writing more in the future—but, we'll see how that goes. 😛

<ul class="space-y-8 not-prose">
	{#each data.posts as post}
	<li class="block">
		<a href="/writing/{post.slug}" class="group grid grid-cols-[50px_1fr] gap-4 hover:bg-slate-100 bg-slate-50 dark:bg-slate-950 p-4 rounded dark:hover:bg-slate-900">
			<NotebookPen size={28} class="m-2" />
			<div>
				<h3 class="font-semibold sm:text-xl group-hover:underline decoration-primary-200 decoration-4 group-hover:decoration-primary-400">{post.title}</h3>
				<DateTime date={post.date} />
				<p>{post.description}</p>
			<div>
		</a>
	</li>
	{/each}
</ul>
