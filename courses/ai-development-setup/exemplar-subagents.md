---
title: Exemplar Subagents
description: 'Twelve subagent patterns worth stealing and a list of stranger ideas, each aimed at a different failure mode of one agent working alone.'
---

Once you've decided that delegation makes sense, the next question is what to delegate _to_. "A code reviewer" is the default answer, and it's a fine one. It's also only one of many.

Here's a catalog. Each entry is a subagent (a helper agent the main agent starts with its own fresh context and a written brief) that earns its keep by being separate from the agent doing the main work. Start with one or two. [Subagents](subagents.md) explains why more than about seven gets hard to manage.

## The table

| Pattern                      | What the subagent does                                                                  | Why it works                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Codebase scout**           | Finds everything relevant before implementation                                         | Keeps exploration noise out of the implementation context                                          |
| **Parallel investigator**    | Tests one debugging hypothesis                                                          | Multiple hypotheses can be investigated simultaneously                                             |
| **Adversarial reviewer**     | Tries to find concrete flaws in finished work                                           | Fresh context fights implementation tunnel vision                                                  |
| **Test designer**            | Derives tests from requirements independently                                           | Avoids simply testing what was implemented                                                         |
| **Dependency archaeologist** | Investigates an unfamiliar library, framework, or API                                   | The main agent gets distilled knowledge instead of documentation sludge                            |
| **Migration mapper**         | Takes ownership of one subsystem in a large migration                                   | Natural partitioning and parallelism                                                               |
| **Log and test analyst**     | Processes enormous noisy output                                                         | Compresses 50K lines into actionable findings                                                      |
| **Contract verifier**        | Checks implementation against an RFC (a published specification), spec, or API contract | A different context focuses attention on compliance                                                |
| **Security investigator**    | Traces trust boundaries, auth, and data exposure                                        | Bounded specialist investigation                                                                   |
| **Performance investigator** | Profiles and identifies likely bottlenecks                                              | Research can proceed separately from implementation                                                |
| **Historical investigator**  | Uses Git history, issues, and pull requests to explain why code exists                  | Keeps archaeology from contaminating current reasoning                                             |
| **Documentation verifier**   | Actually executes the examples in documentation                                         | Finds the wonderfully human condition where documentation describes software that no longer exists |

Notice what most of these have in common. They either keep noise out of the main context, or they bring a perspective the author of the code can't have.

## Other ideas

These are rougher. Treat each as a starting brief, and adjust it to your codebase. A few overlap the table: the git historian is the historical investigator with a sharper brief, and "prove me wrong" is the adversarial reviewer pointed at a claim instead of a diff. What's different is the brief.

- **The "prove me wrong" agent**: Hand it a claim, and its only job is to disprove it.
- **The new hire**: Give a worker the public API but deliberately withhold the implementation details. This is super good for auditing the public-facing interfaces and documentation of SDKs, component libraries, command-line tools, APIs, and internal developer platforms.
- **The requirements lawyer**: Have it read the requirements first, and only then give it the implementation. That's two steps. Start it with just the requirements, then send the implementation afterward with `SendMessage`, since a finished subagent keeps its history. Or use two workers.
- **The "write tests without seeing the implementation" agent**: Have it write the tests in isolation from the implementation. At the very least, you can have it propose the requirements for the tests that get written.
- **The git historian**: Have it use `git log`, `git blame`, old pull requests, issues, comments, and deleted implementations to work out the anthropology of how we got here.
- **The "find the hidden coupling" agent**: Assume a given component has undocumented dependencies. Search specifically for shared database state, environment variables, global state, events, queues, cache keys, implicit initialization order, file-system assumptions, and tests that depend on implementation details. Have it return a dependency map.
- **The blast radius agent**: Blast radius is how much damage a change or an agent can do. Search imports, runtime callers, type dependencies, tests, build tooling, documentation, external interfaces, generated artifacts, and deployment assumptions. Rank the findings by confidence and severity. (For the broader idea of limiting what can go wrong, see [Blast Radius](blast-radius.md).)
- **The "delete it" agent**: Look for ways to _not_ do this work. Specifically investigate whether you can delete the existing code, use an existing primitive, collapse layers, remove the requirement entirely, or solve the problem with configuration.
- **The future maintainer**: Give the worker the completed change, but pretend six months have passed and the original author is unavailable.
- **The red team**: Take anything risky and pretend the worst thing possible happened. For example: "Assume the migration failed catastrophically in production and work backwards from there. Identify plausible failure modes involving data, deployment ordering, rollback, compatibility, partial migration, version skew, background workers, and cached state. For each, identify a preventative verification."
- **The invariant hunter**: Infer the invariants that a code change or feature appears to depend on. Examples: a workflow always has a namespace, a function is only called after authentication, IDs must remain globally unique. Find where each invariant is enforced, and identify the ones that are assumed but never enforced.
- **The contradiction hunter**: Go through your documentation, types, tests, implementation, and examples, and determine where they disagree. Report the contradictions with evidence.
- **The boundary attacker**: Find pathological but valid inputs near every boundary: empty collections, maximum sizes, Unicode, duplicate values, zero, negative numbers, time zone boundaries, concurrent operations, retries, partial failures, and cancellation.
- **The "change one assumption" agent**: Identify the five most important assumptions behind a design. For each one, what happens if it becomes false?

## How to use this list

Before turning any of these into a saved agent, run it by hand a few times with a written brief. [Delegating Well](delegating-well.md) covers what goes in that brief. Then [Configuring Subagents](subagent-configuration.md) covers turning it into a definition file.

Many of the same ideas also work as [skills](adapting-prior-art.md). The deciding question is in [Skill or Subagent?](skill-or-subagent.md).

A good subagent is a specific question that one agent can't ask itself.
