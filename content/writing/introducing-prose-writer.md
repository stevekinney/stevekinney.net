---
title: Introducing Prose Writer (Beta)
description: >-
  A little TypeScript library for building Markdown-friendly strings without
  template literal sprawl.
date: 2026-01-12T18:00:31.000Z
modified: 2026-01-12T18:02:20.000Z
published: true
---

I just published [`prose-writer`](https://www.npmjs.com/package/prose-writer) to npm. It is still in **beta**, but it already fixes a small but constant annoyance: building structured text in code without turning your prompt or doc template into a fragile mess of `\n` and `join()` calls. I've been using it for a while now. Pretty much the only reason that I'm calling it a beta is because I'm the only one using it. If y'all try it out and don't find any deal breakers, then I'll go ahead and bump it up to 1.0.0.

## The Pain Point

So, what exactly is the problem that I'm trying to solve? If you build LLM prompts, docs, release notes, or CLI output in code, you have probably written (and later regretted) a giant template literal—with weird intentation. It starts simple, then you add conditionals, loops, and optional sections. Suddenly your output is a spaghetti bowl of `map().join()`, manual spacing, and brittle concatenation. The formatting gets scattered across the code instead of living in one coherent place.

Here is a naïve example of one of my secret pet peeves:

```ts
function somethingThatTotallyNeedsAPrompt() {
  if (someConditional) {
    return `The prompt starts off normal.

But, then if you need to add new lines, you have to get all gross with your indentation.`;
  }
}
```

Gross, right?

## How Prose Writer Solves It

**TL;DR**, I basically stole the approach from [`code-block-writer`](https://npm.im/code-block-writer) and applied it to writing prompts in Markdown. Prose Writer gives you a fluent builder for structured, markdown-friendly text. Instead of smashing strings together, you assemble sections, lists, tags, and code blocks with a chainable API that reads like the output you want.

It centralizes spacing rules so you do not have to think about blank lines or indentation. It also includes safe escaping for untrusted content, helpers for JSON/YAML output instructions, and a small set of utilities for common Markdown patterns.

## How It Works

At the center is a `write()` function that returns a `ProseWriter` instance. Each `write()` call appends a paragraph (it ends with a newline) and most block helpers handle their own spacing, so the output reads like real markdown.

```ts
import { write } from 'prose-writer';

const prompt = write('You are a helpful assistant.')
  .section('Guidelines', (w) => w.list('Be concise', 'Cite sources'))
  .tag('input', userText)
  .toString();
```

Some highlights that have already saved me time:

- **Chainable blocks**: `.section()`, `.list()`, `.tag()`, `.codeblock()`.
- **Iteration without string gymnastics**: `.each()` instead of `map().join()`.
- **Reusable fragments**: `.append()` and `.clone()` for composable prompt parts.
- **Structured output helpers**: `.json()` and `.yaml()` to set expectations.
- **Safety by default**: `prose-writer/safe` escapes markdown when needed.
- **Token awareness**: `.tokens()` gives a rough size estimate.

## Common Use Cases

The obvious use case is LLM prompts, but I have already used it in a handful of other places:

- **Prompt builders**: keep persona, rules, examples, and context in clean, composable sections.
- **Documentation generation**: turn data structures into readable markdown with consistent formatting.
- **Release notes**: build headings and bullet lists from changelog data.
- **CLI output**: produce human-friendly summaries without manual spacing.
- **Conditional templates**: include only the sections that matter without brittle string logic.

## Beta Notes

This is a **beta** release. The core API is stable enough for real use, but I am still refining ergonomics and edge cases. If you try it, I would love feedback on the API shape and any rough edges you hit.

If this sounds useful, you can grab it here: [`npm install prose-writer`](https://www.npmjs.com/package/prose-writer).
