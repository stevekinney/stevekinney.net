---
title: Referencing Files in Claude Code
description: >-
  Reference files, directories, images, imports, and generated context in Claude
  Code without overloading the session.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code](https://code.claude.com/docs/en/overview) can search the
repository, but explicit file references still help. They tell Claude which
files define correctness, not just which files happen to be nearby.

## Use @path References

Use `@` to reference files and directories:

```text
Read @src/lib/server/invitations.ts and
@src/lib/server/invitations.test.ts. Add the missing expired-token regression
test before editing production code.
```

Use directories when the pattern matters:

```text
Inspect @src/routes/api/ for existing error response conventions.
```

Do not attach the entire repository when two files and one test define the task.

## Imports in Memory Files

`CLAUDE.md` can import other files with `@path` references:

```md
@AGENTS.md
@docs/testing.md
```

Use imports to keep shared instructions in one place. Do not duplicate long
guidance across `CLAUDE.md`, rules, and skills.

## Images and Non-Code Context

Claude Code can work with images and other context when the tool surface
supports it. Use that for user interface bugs, diagrams, and visual regression
work, but still tie the request back to files and verification:

```text
Compare this screenshot to @src/lib/components/checkout-form.svelte.
Fix the spacing regression and run the component test.
```

## Ask for Citations

For investigation work, require file references:

```text
Explain where billing webhooks are handled. Cite the files and functions you
used. Do not edit files.
```

If the answer cannot cite the relevant files, the next step is more context, not
implementation.
