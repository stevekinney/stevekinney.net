---
title: Courses on Frontend Masters
description: A somewhat-complete list of courses that Steve has taught with Frontend Masters.
layout: page
date: 2023-12-27T19:28:51-07:00
modified: 2024-04-15T06:34:21-06:00
---

<script>
	import courses from '$lib/courses';
	import Card from '$lib/components/card.svelte';
</script>

## Full Workshop Walkthroughs

- [Figma for Developers](/courses/figma)
- [Building Design Systems with Storybook](/courses/storybook)
- [Web Security](/courses/web-security)
- [Introduction to Testing in JavaScript](/courses/testing)

## Recordings

I am lucky enough to teach a bunch of courses with my friends at [Frontend Masters](https://frontendmasters.com). We've been working together since 2016. Before I was a teacher, I was a customer back when I was learning the ropes. I can't recommend them highly enough. Below, I've listed out some of the courses that I've taught over the last few years. You can find the most up-to-date list [here](https://frontendmasters.com/teachers/steve-kinney/).

<ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 not-prose">
	{#each courses as course}
		<Card title={course.title} description={course.description} url={course.href} as="li" />
	{/each}
</ul>
