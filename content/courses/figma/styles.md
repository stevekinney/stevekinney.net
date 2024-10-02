---
title: Styles
description: Master consistency and efficiency in Figma with Shared Styles. Simplify your workflow by reusing design attributes for text, colors, and effects across projects.
date: 2024-03-09T14:19:54-05:00
modified: 2024-09-28T11:31:17-06:00
---

> [!NOTE] Styles and Variables
> Figma introduced a new feature—that is currently in beta—called [variables](variables.md). There is a certain amount of overlap between the two features. That said, **variables** don't—and can't—replace styles just yet. You can read some more about the differences in [Styles vs. Variables](styles-vs-variables.md).

Shared styles allow you to store information about the color, text properties, shadows, or layouts into reusable styles. This is cool because if you update that style, then anything that points to that style will also update accordingly.

You can create shared styles for any of the following:

- Colors
- Text
- Effects (e.g. shadows and blurs)
- [Layout Grids](layout-grids.md)

## Text Styles and Color Styles

One of the things to notice here is that text styles and color styles are separate. This is intended to make your life easier.

You don’t need to make three styles for red text: one right-aligned, one center-aligned, and one-left aligned. You can make your color style and your alignment style and them apply them both separately to the layer in question.

## Naming Conventions

The way you name your styles will help you as your design does it inevitable march into complexity. You can use a slash in the name of your file to create an ad hoc folder-like structure to your components.

By using a forward slash in your style names, you can group your colors by theme or hue or type styles by size or use case. You might group your grid styles by the viewport of whatever device they’re intended for.

## Creating Styles at Scale

- Let’s create a style based off of one of the colors.
- This is tedious, let’s actually create them in bulk by renaming these little color swatches to whatever we want the styles to be called.
- We’ll a plugin called [Styler](https://www.figma.com/community/plugin/820660579767995949/Styler) to create the styles.

## Generating CSS from Styles

If you’re going to go through all of the work to create styles in Figma, it would be nice if you could export some of the basic ideas of those styles into CSS or SCSS variables to use in your code. It turns out that you can with a plugin called [CSSGen](https://www.figma.com/community/plugin/742750636238601912/CSSGen).

## Batch Renaming

Larry Wall, the creator of the Perl programming language, famously said that the three great virtues of a programmer were laziness, impatience, and hubris. In his honor, let's talk about way for renaming layers in bulk. This will aid us when we start creating styles based on layers.

- Select a row of color layers.
- Use the Quick Action panel and search for Rename or hit `Command/Control-R`.
- Rename them all using the Gray / $n00 (the $n is a variable for a number that will increment).
