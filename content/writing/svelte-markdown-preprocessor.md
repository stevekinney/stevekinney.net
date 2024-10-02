---
title: Creating a Markdown Preprocessor for Svelte
description: "Let's look at how to write our own preprocessor for SvelteKit."
date: 2024-01-14T13:21:01-07:00
modified: 2024-09-28T11:31:14-06:00
published: true
tags:
  - svelte
  - ast
---

This website is built in [Svelte][] and using [SvelteKit][]. Most of the content is written in Markdown. At the time of this writing, I'm using [mdsvex][] to transform the Markdown into Svelte components—and eventually HTML. It's mostly fine, it works, and I'll probably keep using it for the foreseeable future. That said, it does have some bugs and edge cases.

- Custom components don't appear to be working in Svelte 4, which may or may not be related to [this issue](https://github.com/pngwn/MDsveX/issues/474).
- Layouts don't support `lang="ts"`.
- If both your layout and your content have a `<script>` element, then they'll collide in an explosion of sadness.
- You can't have Markdown inside of HTML tags. To be fair, this is a limitation of [Remark][] and not mdsvex.
- And, probably some other things that I'm forgetting right now.

There are also a few bespoke, esoteric things that I've been thinking about doing to make my life easier that probably wouldn't be a good fit for a more widely-used library. I was also just generally curious about how [preprocessing](https://kit.svelte.dev/docs/integrations#preprocessors) works in Svelte and SvelteKit.

So, of course, I decided to light half of a three-day weekend on fire and do a first pass at building my own Markdown preprocessor for Svelte. Now, let's be clear: This is in _no way_ a substitute for mdsvex. This is more of an intellectual exercise and investigation into how to build your own preprocessor than anything else.

## Anatomy of a Preprocessor

Your average Svelte component has three-ish pieces to it: the `<script>` tags, a `<style>` tag, and the rest of your markup. Unsurprisingly, your preprocessor has a structure that somewhat mirrors that.

```js
const preprocess = () => {
	return {
		name: 'svelte-preprocessor-name',
		markup: ({ content, filename }) => {},
		script: ({ content, filename }) => {},
		style: ({ content, filename }) => {},
	};
};
```

The preprocessors run in the order that I listed them in the example above. Since, we're worried about converting Markdown to HTML today, we're only to concern ourselves with the `markup` method on `PreprocessorGroup` object seen above.

We can start with something like this to get us going.

```js
import { processMarkdown } from './markdown-to-html.js';

const svelteMarkdown = () => {
	return {
		name: 'svelte-markdown',
		/**
		 * @param {object} options
		 * @param {string} options.content
		 * @param {string} options.filename
		 */
		markup: ({ content, filename }) => {
			if (filename.endsWith('.md')) {
				return processMarkdown({ content, filename });
			}
		},
	};
};

export default svelteMarkdown;
```

Now, clearly, all of the heavy-lifting is being done by `processMarkdown`, which we haven't defined yet. But, this will serve as the basic foundation for our preprocessor. We just need to tell Svelte that it exists.

In `svelte.config.js`, add the following:

```js
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import svelteMarkdown from './src/lib/svelte-markdown.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'], // Add .md to the list of extensions
	preprocess: [vitePreprocess(), svelteMarkdown()], // Add our preprocessor

	kit: {
		adapter: adapter(),
	},
};

export default config;
```

Now, since `processMarkdown` doesn't exist, things will blow up spectacularly, but you can just toss an empty function in it's place if you want to and carry on with your life.

## Writing the Processor

The next step is to make our preprocessor actually _do something_. Let's say we have the following hybrid of Svelte and Markdown.

```md
<script lang="ts">
  const exampleVariable = 'Variable Content';
  const thisShouldBeIgnored = "Don't **mess** with code.";
</script>

# A Markdown Title

- {exampleVariable}
- Markdown Content

<p>**Markdown** inside of an HTML element.</p>
```

We'd ideally like to translate it into something that Svelte will render correctly.

```html
<h1>A Markdown Title</h1>

<ul>
	<li>{exampleVariable}</li>
	<li>Markdown Content</li>
</ul>

<p>**Markdown** inside of an HTML element.</p>
```

(The `script` tag should stay in place, but the syntax highlighter that I'm using on this website is making the formatting look gross. So, I'm omitting it. But, you can check out [this unit test](https://github.com/stevekinney/svelte-markdown-example/blob/dd2305ea82eca68a674f9490f69cd4f008924086/src/lib/markdown-to-html.test.js#L6-L22) if you want a better look.)

Now, you'll notice that I haven't solved for processing Markdown inside of HTML tags. As I mentioned earlier, this is a—most likely, intentional—limitation of Remark. There is a plugin called [`rehype-raw`](https://github.com/rehypejs/rehype-raw) that solves this issue, but I found that it didn't play nicely when I tried to use Svelte components in my Markdown. It treats my Svelte components as regular HTML tags and try to do me a favor and make the, lowercase, which then meant that Svelte didn't recognize them as components. That's another battle for another three day weekend, I suppose.

### Converting Markdown to HTML

The first step is to turn our Markdown into HTML. I'm going to use [Remark][] and [Rehype][] for this along with [Unified][] to bring them both together.

- [Remark][] takes your Markdown and turns it into an [AST][mdast].
- [`remark-rehype`][remark-rehype] translate your [Markdown AST][mdast] into an [HTML AST][hast].
- [`rehype-stringify`][rehype-stringify] turns that HTML AST into a string of HTML.
- [Unified][] is a library for making a pipeline out of this whole process.

There are a metric ton of plugins that allow you to do all sorts of interesting transformations to either the Markdown AST or the HTML AST along the way. If you're not already familiar with Remark and Rehype, you can and should check out [Awesome Remark](https://github.com/remarkjs/awesome-remark) and [Awesome Rehype](https://github.com/rehypejs/awesome-rehype).

So, our Markdown to HTML pipeline is going to look something like this:

```js
/**
 * @param {string} content
 */
const toHTML = (content) =>
	unified()
		.use(remarkParse)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.process(content);
```

We want to keep our existing markup. So, we're turning on `allowDangerousHtml`. Turning it off will strip out your `<script>` and other HTML tags, which might be a good thing if you don't ever intent on embedding components or anything else into your content.

### Processing the Component

Next, we need to integrate this into `processMarkdown` in order to wire it together with our preprocessor. For my first pass at this, I ended up with something that looks like this:

```js
/**
 * @param {object} options
 * @param {string} options.content
 * @param {string} options.filename
 */
export const processMarkdown = async ({ content, filename }) => {
	const result = new MagicString(content);
	const { html } = parse(content);

	const { start, end } = html;

	const processed = await toHTML(content.slice(start, end));

	result.update(start, end, String(processed));

	return {
		code: result.toString(),
		map: result.generateMap({ source: filename }),
	};
};
```

The `content` and `filename` are being passed in by SvelteKit. I'm using MagicString to allow me to mutate the string and produce a source map along the way in order to see the original content in my developer tools.

I chose to use the `parse` function found in `svelte/compiler` in order to get the indices of the start and end of the HTML (e.g. not JavaScript or CSS) of the component. In my earlier experiments, passing the entire component into my `toHTML` function didn't cause any problems since we still have that issue where Markdown inside of HTML tags is ignored, but I had just climbed out a rabbit hole of writing my own AST manipulation functions and decided to leave this little piece in there for now.

## The Result

You can check out the code from my little experiment [here](https://github.com/stevekinney/svelte-markdown-example/tree/dd2305ea82eca68a674f9490f69cd4f008924086). In particular, I invite you to check out the following files:

- [`svelte.config.js`](https://github.com/stevekinney/svelte-markdown-example/blob/dd2305ea82eca68a674f9490f69cd4f008924086/svelte.config.js#L8-L9)
- [`src/lib/svelte-markdown.js`](https://github.com/stevekinney/svelte-markdown-example/blob/dd2305ea82eca68a674f9490f69cd4f008924086/src/lib/svelte-markdown.js)
- [`src/lib/markdown-to-html.js`](https://github.com/stevekinney/svelte-markdown-example/blob/dd2305ea82eca68a674f9490f69cd4f008924086/src/lib/markdown-to-html.js)

There is still a lot that this _doesn't_ do and I absolutely cannot recommend using it in production.

- It doesn't support layouts.
- It doesn't support custom components.
- I'm not entirely sure that Remark won't do bad things to your `{#each}` and `{#if}` blocks.

But, for the purposes of learning a little bit more about how preprocessing works in SvelteKit, I think we can go ahead and fly a mission accomplished banner.

[mdsvex]: https://mdsvex.com/docs
[Svelte]: https://svelte.dev/
[SvelteKit]: https://kit.svelte.dev
[Remark]: https://github.com/remarkjs/remark
[Rehype]: https://github.com/rehypejs/rehype
[Unified]: https://github.com/unifiedjs/unified
[remark-rehype]: https://npm.im/remark-rehype
[rehype-stringify]: https://npm.im/rehype-stringify
[mdast]: https://github.com/syntax-tree/mdast
[hast]: https://github.com/syntax-tree/hast
