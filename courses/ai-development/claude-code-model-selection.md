---
title: Claude Code Model Selection
description: >-
  Choose Claude Code models with aliases, defaults, Opus planning, effort,
  one-million-token context, fallback chains, and provider differences.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code model configuration](https://code.claude.com/docs/en/model-config)
changes quickly. As of June 23, 2026, the important durable idea is to use
aliases and task shape rather than hardcoding exact model identifiers everywhere.

## Useful Aliases

Claude Code supports aliases such as:

- `default`
- `best`
- `fable`
- `sonnet`
- `opus`
- `haiku`
- `sonnet[1m]`
- `opus[1m]`
- `opusplan`

As of the current documentation, `opus` maps to
[Opus 4.8](https://code.claude.com/docs/en/model-config) on the Anthropic API,
while Claude Platform on AWS, [Amazon Bedrock](https://aws.amazon.com/bedrock/),
[Google Vertex AI](https://cloud.google.com/vertex-ai), and
[Microsoft Foundry](https://azure.microsoft.com/products/ai-foundry/) can resolve
the same alias differently. `sonnet` maps to
[Sonnet 4.6](https://code.claude.com/docs/en/model-config) on the Anthropic API
and Claude Platform on AWS, and
[Fable 5](https://code.claude.com/docs/en/model-config) is available for explicit
use when the account and retention policy allow it. Check provider-specific
model routing before making a team-wide rule.

## Defaults

Claude Code defaults vary by account type and provider. That means "use the
default model" is a reasonable personal workflow but a weak reproducibility
claim. For team processes, specify the alias and date the guidance.

```text
As of 2026-06-23, use `sonnet` for routine implementation and `opusplan` for
planning complex changes before execution.
```

## Opus Plan

`opusplan` uses Opus for planning and Sonnet for implementation. It is a good fit
when the hard part is design, not typing code. Ask for the plan first and review
it before allowing broad edits.

## Effort and Context

Claude Code also supports effort controls such as `/effort` and large-context
aliases such as `sonnet[1m]` and `opus[1m]`. Larger context is not automatically
better. It is useful when the task depends on many files, long logs, or generated
artifacts. It is wasteful when a targeted test and two source files define the
answer.

## Fallback Chains

Use fallback models for reliability:

```bash
claude --model opus --fallback-model sonnet
```

Fallbacks are operational policy. They should preserve the intent of the task,
not silently downgrade a security review into a cheap rewrite.
