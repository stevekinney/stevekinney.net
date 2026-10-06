---
title: Managing a Long Session
description: 'Continue, compact, clear, or rewind: pick the right move for a long session, and know what each one costs and quietly throws away.'
---

[Prompt caching](caching-and-cost.md) is about what context _costs_. The question you'll face more often is what to do with that context once a session gets long, or starts going sideways.

A _session_ is one conversation with the agent, and its _context_ is everything the model can see in it. Both get heavier with every _turn_: one response to a message you send, however many files it reads or commands it runs.

## Four moves

You've basically got four. All but the first are slash commands (commands you type that start with `/`):

- **Continue**: Do nothing. The harness summarizes the conversation for you when it needs to.
- **`/compact`**: Summarize now, at a moment you choose.
- **`/clear`**: Start over with an empty conversation.
- **`/rewind`**: Truncate back to an earlier turn and, optionally, restore the files to match. The restore only covers edits the agent made with its file tools. [Recovering a Failing Session](recovering-a-failing-session.md) covers what it misses, and how to salvage what you learned before a `/clear`.

The short version: _undo is for wrong; condense is for long._

If something was _wrong_, undo it. If it's merely _long_, shrink it without losing the thread. Mix those up and you compact a mistake into a summary where it looks like a decision.

| Situation                                                                         | Reach for                                    |
| --------------------------------------------------------------------------------- | -------------------------------------------- |
| Work is continuous, going well, and context is filling up                         | Continue                                     |
| You've hit a natural phase boundary and the work continues                        | `/compact`, deliberately                     |
| The next task is unrelated to this one                                            | `/clear`                                     |
| The original attempt and two corrections have failed, and you're patching patches | `/clear`, after you salvage what you learned |
| One specific edit was wrong                                                       | `/rewind`                                    |
| You're in the middle of verification                                              | None of them. Finish the check first.        |

That last row matters more than it looks. After a compaction, "the tests passed" is a sentence in a summary, not an observation. Check the result before you shrink the evidence away.

## Tasting notes

- **Compaction is cheap while the cache is warm**: The summarization request carries your whole conversation, so it reads your main conversation's prompt cache. That cache lasts an hour of inactivity on a Claude subscription (within your plan's usage) and five minutes with an API key. Compact after it expires, and you pay to reprocess the entire history. (The five-minute rule for compaction in [Prompt Caching and Cost](caching-and-cost.md) covers the cache entries the summarization request itself writes, not the cache it reads.)
- **`/rewind` is the cheapest move of the bunch**: It truncates back to a prefix that's already cached, as long as that cache hasn't expired.
- **What reloads after `/clear` or `/compact`**: Your project-root `CLAUDE.md` (the instruction file the harness loads at the start of a session; `AGENTS.md` in Codex) is re-read from disk. Nested `CLAUDE.md` files and path-scoped rules don't come back until the agent reads a matching file again. Claude Code's documentation names only the project-root file as re-read, so put anything critical there.
- **Editing `CLAUDE.md` mid-session does nothing yet**: The change takes effect at the next `/clear`, `/compact`, or restart.
- **Summaries compound**: Compact three times, and you're working from a summary of a summary of a summary.
- **Rules can fall out of the summary**: [In one benchmark](https://arxiv.org/abs/2606.22528), an agent violated a constraint 0% of the time while the constraint survived compaction, and 38% of the time once it got summarized away.

That last one is the practical takeaway. A rule that has to survive belongs in a file that reloads or, better yet, in a permission rule (a setting that allows or denies specific tool calls) that doesn't depend on the model remembering anything. [User and Project Instructions](user-and-project-instructions.md) covers where rules live, and [The Enforcement Ladder](the-enforcement-ladder.md) covers which ones need more than a sentence.

The cheapest long session is the one where nothing important lives only in the conversation.
