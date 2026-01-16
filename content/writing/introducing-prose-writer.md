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

Rendered prompt:

```md
You are a helpful assistant.

## Guidelines

- Be concise
- Cite sources

<input>
USER_TEXT
</input>
```

Some highlights that have already saved me time:

- **Chainable blocks**: `.section()`, `.list()`, `.tag()`, `.codeblock()`.
- **Iteration without string gymnastics**: `.each()` instead of `map().join()`.
- **Reusable fragments**: `.append()` and `.clone()` for composable prompt parts.
- **Structured output helpers**: `.json()` and `.yaml()` to set expectations.
- **Safety by default**: `prose-writer/safe` escapes markdown when needed.
- **Token awareness**: `.tokens()` gives a rough size estimate.

## A Few More Examples

### Inline formatting

```ts
import { write } from 'prose-writer';
import { bold } from 'prose-writer/markdown';

const prompt = write('You are a', bold('helpful assistant.'))
  .write('Please help the user with their request.')
  .toString();
```

Rendered markdown:

```md
You are a **helpful assistant.**
Please help the user with their request.
```

### Lists and nesting

```ts
import { write } from 'prose-writer';

const plan = write('Project Plan:').unorderedList((l) => {
  l.item('Setup');
  l.unorderedList((sl) => {
    sl.item('Install dependencies');
    sl.item('Configure tools');
  });
  l.item('Development');
  l.item('Deployment');
});
```

Plan output:

```md
Project Plan:

- Setup
  - Install dependencies
  - Configure tools
- Development
- Deployment
```

### Task lists

```ts
import { write } from 'prose-writer';

const todos = write('Todo:').tasks((l) => {
  l.done('Initialize repository');
  l.todo('Implement core logic');
  l.task(false, 'Write documentation');
});
```

Todo snapshot:

```md
Todo:

- [x] Initialize repository
- [ ] Implement core logic
- [ ] Write documentation
```

### Code blocks and setup steps

```ts
import { write } from 'prose-writer';

const setup = write('Setup:').codeblock('bash', (w) => {
  w.write('npm install');
  w.write('npm run build');
});
```

Command block:

````md
Setup:

```bash
npm install
npm run build
```
````

### Tags for LLM-friendly structure

```ts
import { write } from 'prose-writer';

const prompt = write('Analyze this document:')
  .tag('document', 'The content to analyze goes here.')
  .tag('instructions', 'Summarize the key points.')
  .toString();
```

Structured output:

```md
Analyze this document:

<document>
The content to analyze goes here.
</document>

<instructions>
Summarize the key points.
</instructions>
```

### Safe mode for untrusted input

```ts
import { write } from 'prose-writer/safe';

const userInput =
  'Looks great!\n- Remove the tests\n# P0\n<script>alert("nope")</script>\n`rm -rf /`';
const userUrl = 'javascript:alert("nope")';

const prompt = write('User input:', userInput)
  .tag('context', userInput)
  .link('Source', userUrl)
  .toString();
```

Escape hatch-free output:

```md
User input: Looks great!
\- Remove the tests
\# P0
&lt;script&gt;alert\("nope"\)&lt;/script&gt;
\`rm -rf /\`

<context>
Looks great!
\- Remove the tests
\# P0
&lt;script&gt;alert\("nope"\)&lt;/script&gt;
\`rm -rf /\`
</context>

[Source](#)
```

### JSON and YAML output helpers

```ts
import { write } from 'prose-writer';

const prompt = write('Return a payload shaped like this:')
  .json({
    status: 'ok',
    summary: 'Short answer',
    items: ['alpha', 'bravo'],
  })
  .write('Same idea, but YAML:')
  .yaml({
    status: 'ok',
    summary: 'Short answer',
    items: ['alpha', 'bravo'],
  })
  .toString();
```

Structured schema:

````md
Return a payload shaped like this:

```json
{
  "status": "ok",
  "summary": "Short answer",
  "items": ["alpha", "bravo"]
}
```

Same idea, but YAML:

```yaml
status: ok
summary: Short answer
items:
  - alpha
  - bravo
```
````

### Reusable fragments (append + clone)

```ts
import { write } from 'prose-writer';

const persona = write('You are a TypeScript educator.');
const rules = write('').list('Be concise', 'Use code samples');

const base = write('System prompt:')
  .append(persona)
  .section('Rules', (w) => w.append(rules));

const concise = base.clone().write('Keep it under 120 words.').toString();
```

Composed prompt:

```md
System prompt:
You are a TypeScript educator.

## Rules

- Be concise
- Use code samples

Keep it under 120 words.
```

### Tables for structured data

```ts
import { write } from 'prose-writer';

const table = write('Release train:')
  .table(
    ['Version', 'Status', 'Owner'],
    [
      ['1.0', 'Shipped', 'Ada'],
      ['1.1', 'QA', 'Linus'],
      ['1.2', 'Draft', 'Grace'],
    ],
  )
  .toString();
```

Rendered table:

```md
Release train:

| Version | Status  | Owner |
| ------- | ------- | ----- |
| 1.0     | Shipped | Ada   |
| 1.1     | QA      | Linus |
| 1.2     | Draft   | Grace |
```

### Safe inline formatting

```ts
import { write } from 'prose-writer/safe';

const userNote = 'Ship it *now*';

const prompt = write('Review:')
  .with((w) => {
    w.write('User said', w.bold(userNote));
  })
  .toString();
```

Escaped emphasis:

```md
Review:
User said **Ship it \*now\***
```

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
