---
title: Where State Lives
description: 'Every kind of state needs one home. Stale notes cost more than re-reading, so date what you verified and supersede old notes instead of rewriting them.'
---

Once agents work across sessions, they need somewhere to put what they know. If you don't choose that place on purpose, it chooses itself: a stray `NOTES.md` here, a half-finished checklist in a chat there. A week later nobody can say which one is true.

[Sentinels](sentinels.md) handle the narrow case of one process telling another a single fact. This lesson is the wider question. Where does each _kind_ of state belong?

## One kind of state, one home

| State                  | Home                                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Source and decisions   | The repository                                                                                                        |
| Work status            | An issue tracker, like [Linear](https://linear.app)                                                                   |
| Research and concepts  | A second brain, like [Obsidian](https://obsidian.md)                                                                  |
| Ephemeral execution    | The session, or the harness's own task list for it                                                                    |
| Evidence               | CI, logs, and reports                                                                                                 |
| Loop plans and scratch | Files in the working tree that you don't commit, regenerated freely                                                   |
| Sentinels and handoffs | Gates: a state directory the agent can't write to. Handoffs: anywhere the agent writes. See [Sentinels](sentinels.md) |

A **second brain** is just a personal knowledge base: a folder of linked notes you keep across projects. The tool matters less than the rule. Each kind of state goes in the venue built for it, because each venue is bad at the others' jobs. Work status in a notes folder drifts. Long research in an issue tracker becomes a wall of text nobody reads.

The loop-plans row is the throwaway kind. The `IMPLEMENTATION_PLAN.md` in [The Ralph Loop](the-ralph-loop.md) is a plan you regenerate whenever it goes stale. That's fine, because it's scratch for one run, not a record of what anyone believed. The sentinels row isn't throwaway. A gate marker is evidence, so when a scheme fails you quarantine suspect markers instead of deleting them. [Designing Sentinels](designing-sentinels.md) explains.

## Stale information costs more than tokens

One thing to keep in mind: stale or inaccurate information is worse than spending the tokens, over and over, to work out the current answer. An agent that has to re-derive a fact is slow. An agent that trusts an out-of-date note is _confidently wrong_, and nothing in the transcript tells you why.

So, treat old notes as leads, not facts.

## Give every note a `verified_at`

The fix is cheap. Give every durable note (a decision, a piece of research) a `verified_at` date that's separate from `updated`. The `updated` date is when someone last edited the file.

Editing a note isn't the same as verifying it. A matching hash, a fingerprint of the file's contents, means the bytes haven't changed, not that the claim is still true. When an agent reads a note whose `verified_at` is old, it should re-check the claim before relying on it.

And a missing date beats an invented one. If nobody knows when something was last checked, leave the field empty so the reader knows to check.

## Supersede, don't rewrite

When a durable note changes, don't overwrite the old one. Mark it `status: superseded` and link it to its replacement. That rule is for durable notes, not for scratch you regenerate.

"What's true now?" and "What did we believe when we made that decision?" are different questions. You lose the second one the moment you overwrite. Decisions especially need that history, because the reason you decided something is often the first thing you'll want when it stops working.

Pick a home for every kind of state, date what you've verified, and never edit your way out of an old belief.
