---
title: Agentic Coding Patterns
description: 'Fifteen reusable patterns for working with coding agents, grouped by the problem each one solves, with when to reach for it and when not to.'
---

By this point in the course, you've seen most of the pieces: skills, subagents, hooks, loops, worktrees. A _pattern_ is a known-good way of putting those pieces together to solve a problem that keeps coming up. "Have a second agent review the diff without seeing the conversation" is a pattern. So is "never let a quality measure move backwards."

I keep a library of about seventy patterns, and most are variations on a much smaller set of ideas. These fifteen are the ones I'd keep if I could only keep fifteen. I picked them with three questions: how common and expensive is the failure it prevents, how cheap is it to adopt, and does it make the other patterns work better?

Every pattern also says when _not_ to use it, which is the half I wish more write-ups included. A pattern applied to the wrong problem doesn't just fail to help. It adds ceremony, burns tokens, and gives you false confidence.

## The four problems

The patterns group by the problem they solve.

| Problem                                                            | Patterns                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [Proving it works](patterns-for-proving-it-works.md)               | Verification loop, test-driven agent loop, test ratchet, mutation gate, fresh-context reviewer |
| [Deciding what to build](patterns-for-deciding-what-to-build.md)   | Research, plan, implement; interview to spec; fault localization first                         |
| [Keeping context useful](patterns-for-keeping-context-useful.md)   | Instructions as a testing contract, progress file, compound engineering                        |
| [Running unattended work](patterns-for-running-unattended-work.md) | Ralph loop, circuit breaker, human-gated autonomy, parallel worktree swarm                     |

If you only read one of these pages, read the first. In my experience, the most common failure is an agent saying it's done when it isn't, and that group is the defense.

## How these relate to the rest of the course

Most of these patterns get a deeper treatment elsewhere in the course, and each pattern links to it when you want the configuration, the failure modes, and the worked example.

A pattern also isn't a mechanism. "Test ratchet" is an idea. Whether you enforce it with a permission rule, a [hook](hooks.md), or a CI check is a separate decision, and [The Enforcement Ladder](the-enforcement-ladder.md) covers that choice. A pattern can live in a [skill](skills.md), a [subagent](subagents.md), or a script, and [Exemplar Skills](exemplar-skills.md) and [Exemplar Subagents](exemplar-subagents.md) show concrete versions of several of them.

Don't adopt all fifteen at once. Pick the one for the failure you hit most often this week, and add the next when you hit the next failure.
