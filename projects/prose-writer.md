---
name: Prose Writer
githubUrl: https://github.com/stevekinney/prose-writer
npmPackages:
  - prose-writer
description: 'A chainable TypeScript library for building formatted text and Markdown without turning every prompt or document into a pile of string concatenation.'
---

[Prose Writer](https://github.com/stevekinney/prose-writer) is a chainable TypeScript library for building formatted text and Markdown. It is useful for prompts, generated documents, and anywhere else that a growing collection of string fragments starts looking suspiciously like a formatting system with no rules.

The API keeps that structure explicit: add prose, headings, lists, and other blocks in order, then render the result as a string. The goal is not to invent another document format. It is to make the format you already need easier to assemble, inspect, and change.
