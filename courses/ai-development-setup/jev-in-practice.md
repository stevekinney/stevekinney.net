---
title: Jev in Practice
description: 'How to ask Jev good questions, roll it out in shadow mode, combine it with hard checks, and avoid its known weaknesses and unverified benchmarks.'
---

[Jev](jev.md) is cheap enough that the temptation is to wire it in everywhere on day one. Resist that. Any classifier is wrong some of the time, and it's your job to decide what a wrong answer costs.

## Best practices

- **Questions**: Give every option a distinct description, include the full list plus an "other" escape hatch, and say _exactly_ what you mean. Jev reads literally.
- **State**: Send evidence rather than summaries, filter out irrelevant detail, and redact secrets before anything gets sent.
- **Batching**: Ask every question that shares the same state in one call. (This is the opposite of fanning out to many agents. It's one request, not many.) [Published runs](https://docs.typesafe.ai/cookbooks/parallel_questions) report it about 12 times cheaper and 10 times faster than separate calls.
- **Thresholds**: Set them per action, based on what a wrong answer would cost. One number for everything doesn't work.
- **Rollout**: Go in this order. Shadow (run Jev alongside the real decision and only record what it would have said), label (check those answers against the truth), set thresholds, add a fallback, enforce, and then monitor.
- **Failure modes**: Jev's judgments should fail _open_, so a timeout or low confidence changes nothing. Hard safety checks, like regular expressions and allowlists, should fail _closed_. Combine them as `max(floor, jev)`: the hard check sets a floor on the risk level, and Jev can raise risk above it but never lower it.

## Anti-patterns

- **Treating Jev's pick as permission to act**: Choosing an action is not authorization.
- **Using the confidence threshold as your safety net**: Confidence is a signal, not a wall.
- **Asking it to do math, counting, or date comparisons**, or to write anything.
- **Keeping one fixed option list for a whole run**, or passing the whole transcript as state.
- **Measuring cost per call instead of cost per completed task.** See [Measuring Whether It Works](measuring-whether-it-works.md).
- **Believing it "can't hallucinate"**: Its output always has the right _type_. It can still be confidently wrong.

## Known weaknesses

TypeSafe's own list for Jev 1.13:

- It reads questions literally and struggles with indirection and double negatives.
- It's bad at numbers, dates, and values like hex or RGB colors.
- Accuracy drops when the state is padded with irrelevant detail.
- It doesn't treat adversarial content as hostile, so injected instructions can steer it. (That's [prompt injection](blast-radius.md), and it applies to Jev too.)
- It sometimes leans toward the first option in a list.

That last one is why shuffling the option order is worth doing.

## Advanced techniques

- **Compaction decisions**: After each turn, ask four questions in one call: Did the request switch gears? Did the last turn finish a unit of work? How much of the earlier work does the next step need? Is the agent in the middle of a multi-step edit? Context size stays in code, and code decides when to compact.
- **Cheap reads**: Jev answers a question _about_ a file so the agent never has to load it. [One published run](https://github.com/disler/ten-levels-of-jev) was 187 times cheaper than an expensive model reading the same file.
- **Files at scale**: Glob (match file names by pattern), prune in code, judge every file in parallel, then open only the match.
- **Skill routing**: Two calls pick at most one skill: the first ranks the candidate skills, and the second re-checks the top few. In [TypeSafe's test](https://docs.typesafe.ai/cookbooks/skill_suggestion), wrong skill loads dropped from 16.8% to 7.3%.
- **Cascades**: A cheap model drafts, Jev checks each part, and the work only goes to an expensive model if a flag fires.
- **Tier guard**: Block [subagent](subagents.md) dispatches (a subagent is a helper agent with its own fresh context) to a model tier well above what the task needs.
- **Agentic Jev**: Give the agent an `ask_jev` tool and let it write its own questions.
- **Observability**: Rerun questions and shuffle the option order to check consistency, and record a receipt for every decision.

## Where to start

Pick one frequent, reversible decision. A Bash command gate is a good candidate. Run it in shadow mode behind a [hook](hooks.md) (a script the harness runs before a tool call) that fails open, calibrate on labeled cases, and _then_ enforce. Move on to the next decision only after that one's working.

## Check the numbers yourself

Most of the speed and cost figures above come from TypeSafe or the authors themselves. In [independent tests](https://dev.to/gde/jev-after-eight-days-of-independent-tests-level-with-mid-price-llms-behind-the-frontier-1kln), Jev trailed frontier models on harder tasks: 61.8% versus 79.1% on invoice processing, and six of seven planted defects found versus seven of seven.

Treat Jev as a fast, cheap first opinion. Keep the final say with a check you trust more.
