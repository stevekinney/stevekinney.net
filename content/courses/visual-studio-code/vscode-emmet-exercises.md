---
modified: 2025-03-18T02:26:30-05:00
title: 'Emmet in Visual Studio Code: Exercises'
---

We don't have a ton of opportunities for hands-on practice in this course. So, let's take the opportunity since we have one.

## Guided Practice

Try these out. I'll give you the answers for the first round.

### Basic HTML5 Template

Type `html:5` to generate a full HTML5 boilerplate.

No frills here—just the essentials. If you can't nail this, you're gonna be retyping the basics forever. Or, just copy and pasting it like the rest of us.

### Simple Nesting

Create a header with a navigation list using: `header>nav>ul>li*3`

Time to nest like a pro. This challenge gently introduces you to hierarchies—think of it as building a mini HTML family tree.

### Sibling Multiplication with Dynamic Text

Generate an unordered list with numbered items by typing: `ul>li.item$*5{Item $}`

Here's where that mysterious\_ _$_ \_comes into play. It's your ticket to automatically numbering things—because who has time to type "Item 1," "Item 2," and so on?

### Grouping and Complex Structures

Build a layout with grouped siblings:

```css
div>(header>nav>ul>li*3)+(section>article*2)+footer
```

Now you're juggling multiple groups at once. It's like HTML origami—fold, group, and expand, all without breaking a sweat.

### Attributes and Customization

Create multiple styled links with attributes:

```css
ul>li*3>a[href="https://example.com"][title="Visit Example"]{Link $}
```

Time to add a dash of personality to your markup. This challenge blends attributes and dynamic content to ensure your HTML isn't just functional—it's got style.

## Challange Time

Yes, these are a bit simpler, but you're on your own this time.

### Basic Paragraph

Create an Emmet abbreviation that generates a `<p>` element with any placeholder text of your choice.

### Simple Unordered List

Write an Emmet abbreviation to generate an unordered list (`<ul>`) with three list items (`<li>`) that each say "Item".

### Image Element with Attributes

Construct an Emmet abbreviation to produce an `<img>` tag with a src attribute set to "image.jpg" and an alt attribute of "Placeholder Image".

### Nested Div Structure

Devise an Emmet abbreviation to create a parent `<div>` containing a child `<div>`.

### Header with Navigation

Form an Emmet abbreviation to generate a `<header>` that contains a `<nav>` with an unordered list (`<ul>`) of two list items (`<li>`).

## Solutions

You can find the solutions [here](vscode-emmet-solutions).
