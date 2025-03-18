---
title: Emmet in Visual Studio Code
description: "Learn how to use Emmet's powerful abbreviation syntax to speed up HTML and CSS development in Visual Studio Code"
modified: 2025-03-18T08:25:14-05:00
---

Emmet is a powerful shorthand system for HTML and CSS, built right into Visual Studio Code. It dramatically speeds up your front-end workflow by letting you write concise abbreviations that expand into full-fledged markup or style rules. Below are the core features and tips for making Emmet work for you, particularly when writing React in TSX or JSX.

## Emmet Abbreviations

Emmet turns short snippets of text into full HTML structures. For instance, if you type `div>ul>li*3` in an HTML file and press `Tab`, you get:

```html
<div>
	<ul>
		<li></li>
		<li></li>
		<li></li>
	</ul>
</div>
```

Here’s a quick look at other common patterns:

`header+main+footer` expands into three sibling elements:

```html
<header></header>
<main></main>
<footer></footer>
```

`ul>li.item*5` creates an unordered list with five list items, each having the class `item`:

```html
<ul>
	<li class="item"></li>
	<li class="item"></li>
	<li class="item"></li>
	<li class="item"></li>
	<li class="item"></li>
</ul>
```

`div.container>img.logo[src="logo.png"]+p` produces a `div` with two children, an image and a paragraph:

```html
<div class="container">
	<img class="logo" src="logo.png" />
	<p></p>
</div>
```

> [!TIP] If you’re not sure which abbreviation to use, type part of the snippet and press `Ctrl+Space` (or `Cmd+Space` on macOS) to see Emmet suggestions.

## Emmet in JSX/TSX

Emmet can also boost your productivity in React files. To ensure it works correctly in `.jsx` or `.tsx` files, configure Visual Studio Code’s settings so Emmet treats these files as HTML. One common approach is adding the following setting in your `settings.json`:

```json
"emmet.includeLanguages": {
  "javascript": "html",
  "javascriptreact": "html",
  "typescriptreact": "html"
}
```

Once that’s in place, you can use the same abbreviations you’d use in an HTML file. For example, in a `MyComponent.tsx`:

```tsx
import React from 'react';

export function MyComponent() {
  return (
    <div.wrapper>div.title{Hello, Emmet!}^^p.subtitle{It even works in React!}</div.wrapper>
  );
}
```

If you type `div.wrapper>div.title{Hello, Emmet!}^^p.subtitle{It even works in React!}` and press `Tab`, Emmet generates:

```tsx
import React from 'react';

export function MyComponent() {
	return (
		<div className="wrapper">
			<div className="title">Hello, Emmet!</div>
			<p className="subtitle">It even works in React!</p>
		</div>
	);
}
```

> [!TIP] Emmet is Aware of JSX
> In JSX, Emmet automatically translates any attributes like `class` into `className` where needed. Always check your expansions, though—some language server features might need an extra second to ensure everything lines up correctly.

## Advanced Emmet Techniques

### Using Grouping with Parentheses `()`

Parentheses let you create complex nested structures and apply multipliers to groups of elements. This is incredibly useful for creating repeated compound structures.

```css
(header>h1)+(main>section*3)+(footer>p)
```

Expands to:

```html
<header>
	<h1></h1>
</header>
<main>
	<section></section>
	<section></section>
	<section></section>
</main>
<footer>
	<p></p>
</footer>
```

You can also use grouping to apply attributes or content to multiple elements:

```css
(div>h2+p).card*3
```

Creates three card divs, each with an `h2` and `p` element:

```html
<div class="card">
	<h2></h2>
	<p></p>
</div>
<div class="card">
	<h2></h2>
	<p></p>
</div>
<div class="card">
	<h2></h2>
	<p></p>
</div>
```

### Using Emmet Filters

Filters modify how Emmet abbreviations expand. They're added at the end of an abbreviation with the pipe (`|`) character.

#### Trim Whitespace Filter (`|t`)

Removes insignificant whitespace from the output:

```css
ul>li*3|t
```

Produces more compact output:

```html
<ul>
	<li></li>
	<li></li>
	<li></li>
</ul>
```

#### Comment Filter (`|c`)

Adds comments to help identify closing tags in large structures:

```css
div>header+main+footer|c
```

Expands to:

```html
<div>
	<header></header>
	<main></main>
	<footer></footer>
	<!-- /div -->
</div>
```

#### BEM Filter (`|bem`)

Makes writing Block Element Modifier (BEM) notation easier:

```css
form.search>input.field|bem
```

Produces:

```html
<form class="search">
	<input class="search__field" />
</form>
```

### Implicit Tags

Emmet has a smart system that infers tag names based on parent-child relationships. This shortens your abbreviations even further.

For example, when creating a list, you can leave out the `li` tag name:

```css
ul>.item*3
```

Emmet knows that `ul` elements typically contain `li` children, so it produces:

```html
<ul>
	<li class="item"></li>
	<li class="item"></li>
	<li class="item"></li>
</ul>
```

Common implicit tags include:

- `li` inside `ul` and `ol`
- `tr` inside `table`
- `td` inside `tr`
- `option` inside `select`

### Lorem Ipsum Text Generation

Emmet includes a powerful lorem ipsum generator to quickly add placeholder text:

```css
p>lorem
```

Creates a paragraph with standard lorem ipsum text:

```html
<p>
	Lorem ipsum dolor sit amet, consectetur adipisicing elit. Qui dicta minus molestiae vel beatae
	natus eveniet ratione temporibus aperiam harum alias officiis assumenda officia quibusdam deleniti
	eos cupiditate dolore doloribus!
</p>
```

You can specify the number of words:

```css
p>lorem10
```

Generates exactly 10 words:

```html
<p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Sit, laboriosam.</p>
```

Combine with multipliers for multiple paragraphs:

```css
article>(h2>lorem5)+p*3>lorem20
```

Creates an article with a heading and three paragraphs:

```html
<article>
	<h2>Lorem ipsum dolor sit amet.</h2>
	<p>
		Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi fugiat veritatis culpa quos
		aspernatur! Laboriosam alias iure fuga possimus officiis.
	</p>
	<p>
		Lorem ipsum dolor sit amet consectetur adipisicing elit. Adipisci labore repellat, asperiores
		quas quae maxime doloremque aliquam? Eius, illo excepturi.
	</p>
	<p>
		Lorem ipsum dolor sit amet consectetur adipisicing elit. Corporis sapiente distinctio illum
		perspiciatis, pariatur at libero. Placeat laboriosam asperiores esse.
	</p>
</article>
```

### Real-World-ish, Complex-ish Example

Here's a complete blog post card with structured content:

```css
article.card>(header.card__header>h2.card__title{Post Title $}+p.card__meta>time+span.card__author{Author Name})+(div.card__content>p*2>lorem)+footer.card__footer>a.btn.btn--primary{Read More}
```

This single abbreviation produces a fully structured blog post card with proper classes, dummy text, and styled buttons—demonstrating the true power of Emmet for rapid frontend development.

## Wrap with Abbreviation

Emmet isn’t just for generating new markup—it can also wrap existing code in a new structure. Highlight the code you want to wrap, then invoke the **Wrap with Abbreviation** command via the Command Palette. Type your abbreviation (for example, `section>div.wrapper`) and press `Tab`. Emmet will enclose your selection in the new markup, saving you the hassle of manual edits.

> [!TIP] Use this feature to quickly refactor blocks of code, adding semantic wrappers or applying consistent styling without interrupting your flow.

## Custom Emmet Snippets

For repetitive patterns or project-specific markup, you can define custom Emmet snippets. Customize these by adding an `emmet.extensionsPath` entry in your settings to point to a folder containing your snippets. For example, create a file named `snippets.json` in your designated folder with content like:

```json
{
  "html": {
    "snippets": {
      "btn": "<button class=\"btn\">$0</button>"
    }
  }
}
```

Then, set the path in your `settings.json`:

```json
{
  "emmet.extensionsPath": "path/to/your/snippets"
}
```

This way, typing `btn` and pressing `Tab` will quickly insert your custom button template.

> [!TIP] Custom snippets can be a game changer when working on projects with repetitive UI elements. Tailor them to your codebase to save time and reduce errors.

These additional techniques and settings elevate Emmet from a simple abbreviation tool to a fully customizable assistant that adapts to your specific development needs.

Now, let's take a look at some [some exercises](vscode-emmet-exercises).
