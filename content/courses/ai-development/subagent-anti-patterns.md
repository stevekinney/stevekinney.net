---
title: Common Sub-Agent Anti-Patterns and Pitfalls
description: Avoid common mistakes when using Claude Code's sub-agent system for delegation and task management.
modified: 2025-07-29T09:05:22-06:00
---

At the time of this writing, sub-agents are still pretty new. (Like, less than a week old.) So, they still have some rough edges.

- **Inconsistent activation** — Claude often ignores an appropriate sub-agent unless you name it explicitly. Even with a solid description in `claude.md`, auto-selection fires only _sometimes_, so “fire-and-forget” delegation isn’t reliable yet.
- **State loss on rejection** — If you decline an agent’s draft, main Claude spins up a _fresh_ copy rather than letting you iterate with the same one. All of that agent-specific context disappears, forcing a ground-up re-run.
- **No mid-stream dialogue** — You can’t ask a running agent clarifying questions or nudge it part-way through a task. The black-box execution means you wait in silence, then accept or reject a lump-sum result.
- **Opaque inner workings** — Internal tool calls and partial thoughts remain hidden. When an agent chews through 50 k tokens you have no incremental visibility, which makes debugging slow or impossible.
- **Token & time bloat** — Each sub-agent adds another context window. Large fleets (10-15+) eat through the 200 k token budget quickly and can run for an hour+ before surfacing anything useful.
- **Performance degradation with “too many chefs”** — A long agent list dilutes relevance signals; the delegating model spends cycles choosing instead of doing. Overlapping responsibilities cause ping-ponging or duplicate work.
- **Tool-scope confusion** — Giving every agent every tool sounds convenient but introduces noise. The model sometimes picks an ill-suited tool or fails because it can’t decide which one to use.
- **Short, shallow outputs** — Even well-defined agents can return a single-sentence verdict (“yeah, looks good”) instead of the requested deep dive. You still need follow-up prompts to get actionable detail.
- **Verbose auto-generated prompts** — The `/agents` wizard produces sprawling system prompts. These eat context, slow reasoning, and still don’t guarantee correct activation. Most users end up trimming them manually.
- **Non-deterministic variance** — The same task with the same agents can yield different plans—or different _no_-shows—run to run. Measuring improvements is tricky because signal swings with each session.
- **Activation edge cases** — Agents created for highly specific events (e.g., post-file-save code-guardian) may never trigger unless the main prompt or repo state matches their narrow pattern exactly.
