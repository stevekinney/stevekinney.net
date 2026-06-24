---
title: Cursor Bugbot and Security Review
description: >-
  Use Cursor Bugbot and Security Agents as review aids while keeping human
  ownership over correctness, risk, and merge decisions.
modified: 2026-06-24
date: 2026-06-23
---

[Cursor Bugbot](https://cursor.com/docs/bugbot) and
[Cursor Security Agents](https://cursor.com/docs/security-agent) add automated
review surfaces around code changes. They are useful because they look at the
diff with a different set of eyes. They are not a replacement for ownership.

## Bugbot

Bugbot reviews changes and flags likely defects. Use it as a second reviewer for
pull requests, especially when a change touches edge cases, error handling, or
cross-file behavior.

Good Bugbot follow-up asks for evidence:

```text
For each Bugbot finding, verify whether the issue is real by reading the changed
code and the closest tests. Fix only confirmed issues. If a finding is invalid,
explain why with file references.
```

Do not accept a bot finding blindly. Do not dismiss it blindly either.

## Security Review

Security Agents focus on risk: secrets, authorization, injection, dependency
surface, dangerous commands, and similar concerns. They are most valuable when
the prompt names the threat model:

```text
Review this pull request for authorization bypasses and secret exposure.
Ignore style issues. Cite exact files and propose the smallest fix for confirmed
security issues.
```

## Security and MCP

MCP servers can expose powerful tools and data. A review agent should treat MCP
configuration as part of the application surface, not editor decoration. Look for
untrusted servers, broad permissions, environment variable leaks, and tools that
can write to external systems.

## Merge Discipline

Automated review output is input. The merge decision still belongs to a human.
Before merging, make sure findings are resolved, tests are green, and the final
diff is understandable without the bot conversation.
