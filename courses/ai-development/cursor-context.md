---
title: Context is King in Cursor
description: >-
  Give Cursor the right files, rules, skills, documentation, and external tools
  without flooding the model with stale context.
modified: 2026-06-24
date: 2025-07-29
---

[Cursor](https://cursor.com) is only as useful as the context you give it. More
context is not automatically better. The goal is **relevant context**: the files,
constraints, examples, and tools that change the answer.

## Context Sources

Cursor can draw from several places:

- Open files, selected code, and recently edited files.
- Mentioned files, folders, symbols, images, and documentation.
- Semantic repository search.
- Project Rules, User Rules, Team Rules, and `AGENTS.md`.
- Skills in `.cursor/skills`, `.agents/skills`, `.claude/skills`, or
  `.codex/skills`.
- Memories that capture reusable preferences.
- MCP servers that expose external data and tools.
- Web search and fetched pages when allowed.

The agent will often find the obvious files itself. You should still name the
files that define correctness.

## Tell Cursor What Matters

Use a short context contract at the top of bigger prompts:

```text
Relevant context:
- The public API is in @src/lib/server/invitations.ts.
- Existing validation tests are in @src/lib/server/invitations.test.ts.
- Follow @.cursor/rules/testing.mdc.

Goal:
Reject expired invite tokens with the same error shape used by revoked tokens.
```

This does two things. It saves search time, and it tells the model what evidence
you expect it to respect.

## Rules, Skills, and Markdown References

Use the smallest durable container that fits the job:

- Use **Rules** for behavior that should apply automatically.
- Use **Skills** for reusable workflows with instructions, scripts, references,
  or assets.
- Use ordinary Markdown files for longer explanations that a human should review
  and version.
- Use Memories for preferences that are useful across sessions but do not belong
  in source control.

Do not hide architectural truth in chat history. If a future contributor needs
it, put it in the repository.

## Avoid Context Rot

Stale context is worse than missing context because it sounds authoritative. When
Cursor makes the same mistake twice, fix the durable instruction source instead
of writing a longer prompt. When a rule or skill no longer matches the codebase,
delete or update it in the same change that updates the code.

For code review prompts, ask Cursor to cite the files it inspected. If the answer
does not mention the file that defines the behavior, the context set is not good
enough yet.
