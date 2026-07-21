---
name: ESLint Plugin Temporal
githubUrl: https://github.com/stevekinney/eslint-plugin-temporal
npmPackages:
  - eslint-plugin-temporal
writingPath: /writing/cursor-rules-temporal-typescript
description: 'ESLint rules for catching Temporal workflow mistakes before they become replay bugs, which is the polite time to learn about them.'
---

[ESLint Plugin Temporal](https://github.com/stevekinney/eslint-plugin-temporal) is a small attempt to move [Temporal](https://temporal.io/) mistakes from runtime archaeology into editor feedback. Workflow code has constraints that normal application code does not, especially around determinism and what is safe to do during replay.

I would rather have [ESLint](https://eslint.org/) complain while I am typing than discover later that a workflow history can no longer replay because I did something clever. Clever is fine. Clever plus durable history is where the bill comes due.
