---
title: Model Selection Strategy in Cursor
description: >-
  Choose Cursor models by task shape, context needs, speed, cost, Max Mode, and
  cloud-agent behavior without hardcoding volatile model claims.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com) changes its model menu frequently. As of June 23,
2026, the official model documentation lists current families from
[Anthropic](https://www.anthropic.com/), [OpenAI](https://openai.com/), and
[Google](https://deepmind.google/). Treat exact model availability, pricing, and
provider routing as volatile.

The durable skill is choosing the right class of model for the work.

## Start with Auto

Cursor's Auto mode routes work across models based on capability, cost, and
reliability. Use it for ordinary implementation, refactoring, and bug fixing
until you have evidence that a specific model is better for the current task.

Auto is also a good default for teaching because it keeps the lesson focused on
the workflow instead of model trivia.

## Escalate for Hard Reasoning

Choose a stronger explicit model when the task has one of these traits:

- Ambiguous architecture decisions.
- Large cross-file refactors.
- Security-sensitive code.
- Complex migrations with many edge cases.
- Reviews where false confidence is expensive.

Ask for a plan first, then decide whether the plan justifies the slower or more
expensive model.

## Use Max Mode Deliberately

Max Mode gives Cursor access to the model's larger context window and premium
reasoning path. It is useful when the task genuinely depends on a broad slice of
the repository. It is wasteful when the task needs three files and a test.

Cloud Agents always run with Max Mode enabled, so write cloud prompts with the
same discipline you would use for an expensive local session: exact scope,
acceptance criteria, and verification commands.

## Keep Model Claims Dated

If you write a rule, tutorial, or team process that names a model, date the
claim:

```text
As of 2026-06-23, use Cursor Auto for default implementation work and escalate to
the strongest available reasoning model for architecture reviews.
```

That phrasing survives menu changes. "Always use Model X" usually does not.
