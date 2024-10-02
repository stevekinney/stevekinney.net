---
title: Creating Custom Shiki Themes with CSS Variables
description: "Let's look at ways to create our own Shiki themes using CSS variables."
published: true
tags:
  - css
  - shiki
date: 2023-12-31T22:08:38-07:00
modified: 2024-09-28T11:31:14-06:00
---

<script>
  import ShikiThemeEditor from '@/routes/tools/shiki-theme-editor/editor.svelte';
</script>

**TL;DR**: I created a little tool for tweaking the CSS variables for [Shiki][] themes and you [can check it out here][tool].

> [!fail] This content is outdated
> This approach worked in the versions of [Shiki][] prior to 1.0, but it's no longer applicable with modern versions.

## The Origin Story

As I was building out this site, I fell down the well-meaning rabbit hole of trying to get a perfect score on [Lighthouse][]. Using [SvelteKit](https://kit.svelte.dev) obviously helped (a lot), but I had one edge case where the color of the comments in my code blocks didn't have enough contrast with the background.

I also didn't particularly care for any of the built-in themes that come with [Shiki][]. So, I wanted to style the code blocks myself. Shiki gives you two and a half ways to do this:

1. Load a theme from JSON, or
2. Use CSS variables.

Is the first option probably the better option—especially, since I am rendering this entire page at build time? Sure. Did I even end up theming the code blocks differently in dark mode? No. I didn't not. Stop asking me so many questions.

## The Problem with Shiki and Dark Mode

Since I'm building the site at build-time and serving pre-rendered pages, Shiki and I have no idea if you're using dark mode or not. It turns out that Shiki give you two ways to deal with this:

1. Render the code block twice and the dark mode code block of `@media (prefers-color-scheme: light)` and vice versa.
2. Use CSS variables.

The astute among you will notice that there is a bit of overlap with the second item on both of those lists. At the time of this writing, that's the approached I chose to go with.

## Using CSS Variables

Using CSS variables with Shiki is fairly straight-forward. Like the lists that have come before this next one, there are two steps:

1. Change the theme to CSS variables.
2. Add some CSS variables.

The latter can be done like this.

```css
:root {
	--shiki-color-text: #d6deeb;
	--shiki-color-background: #011628;
	--shiki-token-constant: #7fdbca;
	--shiki-token-string: #edc38d;
	--shiki-token-comment: #94a4ad;
	--shiki-token-keyword: #c792e9;
	--shiki-token-parameter: #d6deeb;
	--shiki-token-function: #edc38d;
	--shiki-token-string-expression: #7fdbca;
	--shiki-token-punctuation: #c792e9;
	--shiki-token-link: #79b8ff;
}
```

## Building a Theme Creator

Because of the same faulty wiring in my brain that compelled me to build a blog from scratch before even bothering to sit down and write a single blog post, I decided that I needed to build my own theme creator so that I could tweak the colors to my heart's content.

The good news is that I'm just going to share it with you in case you'd like to do something similar. You can check out [the full version here][tool] or play around with the smaller version below.

<ShikiThemeEditor />

The defaults—and what I'm using at the time of this writing are loosely based on [Sarah Drasner's Night Owl theme](https://github.com/sdras/night-owl-vscode-theme).

[tool]: /tools/shiki-theme-editor
[Shiki]: https://shiki.matsu.io/
[Lighthouse]: https://developer.chrome.com/docs/lighthouse/overview
