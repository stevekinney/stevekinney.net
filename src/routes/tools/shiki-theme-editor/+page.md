---
title: Shiki CSS Variable Theme Editor
description: A simple little tool that lets you tweak CSSvariables for the Shiki syntax highligher.
layout: page
---

<script>
	import ShikiThemeCreator from './editor.svelte';
</script>

> [!fail] This tool is obsolete
> This approach worked in the versions of [Shiki][] prior to 1.0, but it's no longer applicable with modern versions.

A simple little tool that let's you tweak CSS variables when using the `css-variables` theme in [Shiki](). You can [read more about how it works here](/writing/creating-custom-shiki-themes). If you're interested, you can check out the code on [Github](https://github.com/stevekinney/stevekinney.net/tree/main/src/routes/tools/shiki-theme-editor).

<ShikiThemeCreator />

[Shiki]: https://shiki.matsu.io/
