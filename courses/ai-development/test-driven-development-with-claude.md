---
title: Test-Driven Development with Claude Code
description: >-
  Use Claude Code for regression-first development with failing tests, smallest
  implementation changes, and explicit verification gates.
modified: 2026-06-24
date: 2025-07-29
---

[Claude Code](https://code.claude.com/docs/en/overview) is strongest when the
definition of done is executable. Test-driven development gives the agent a
tight loop: reproduce the bug, make the test pass, then refactor only if needed.

## A Good TDD Prompt

```text
Bug:
Expired invite tokens are accepted.

Task:
Write the failing regression test first in the closest test file. Then implement
the smallest production change that makes it pass.

Verification:
Run bun test:unit -- src/lib/server/invitations.test.ts and bun run lint.

Stop:
If either command fails for an unrelated reason, stop and report the failure
instead of editing unrelated files.
```

This prompt gives Claude a behavior to reproduce, a scope boundary, and a finish
line.

## Watch the First Test

Do not let the agent write a test that already passes. Ask it to report the
failing assertion before implementation:

```text
After writing the regression test, run it and show the failing assertion before
changing production code.
```

That one sentence prevents a lot of fake coverage.

## Keep Refactors Separate

After the test passes, ask whether a refactor is necessary. Many fixes are better
left small. If the implementation is clear and the tests pass, stop.

When a refactor is justified, run the same verification command afterward. A
green test before a refactor does not prove the refactor is safe.
