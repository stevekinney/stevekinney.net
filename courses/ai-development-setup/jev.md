---
title: Jev
description: 'Jev answers typed questions with a choice, a score, or a probability, never text. Setup, good questions, shadow rollouts, and known weaknesses.'
---

Most of what a coding agent does is not writing. It's deciding. Which skill applies? Is this command safe? Is the work verified? Should we compact now? Today we make those calls by asking a large model to write a paragraph and then hoping the answer parses. That's slow, expensive, and a little silly for a question with three possible answers.

**Jev** is TypeSafe AI's first "System One" model, [launched September 15, 2026](https://typesafe.ai/blog/introducing-system-one-models-and-jev). The name borrows from Kahneman's fast, intuitive System 1 thinking, and TypeSafe uses it for models that make quick, structured decisions instead of generating text. Jev never writes text or code. You give it state and typed questions, and it returns choices, scores, or yes-probabilities with calibrated confidence, meaning its stated confidence should match how often it's right.

The short version: the LLM writes, Jev decides, and code acts.

## The three question types

- **Choice**: Picks one option, out of up to 255.
- **Score**: Places the state on an ordered rubric of 2 to 10 levels.
- **Noul**: A yes/no question. It returns the probability of yes, from 0 to 1.

## Pricing and limits

It costs $0.042 per million input tokens, and output tokens are free. Calls take 70 to 500 milliseconds. A request can be up to 64,000 tokens. It's text-only and strongest in English.

Those numbers are as of October 2026. The shape matters more than the digits: a call is cheap and fast enough to sit inside the loop.

## Where Jev fits in agentic coding

It's not a coding model, and no setting turns your agent into a "Jev agent." You use it in one of two ways. Your agent can build apps that call Jev. Or Jev can sit inside the agent's own harness through hooks (scripts the harness runs at lifecycle events), gateways (proxies between your agent and the model providers), or plugins.

Inside the harness, the decision points look like this, in loop order:

1. Routing a request to a model or agent.
2. Picking a skill and a subset of tools.
3. Gating each tool call before it runs, through the `PreToolUse` [hook](hooks.md) event, which can block the call.
4. Screening tool output for injected instructions. That's a cheap first-pass signal, not a security boundary, because injected text can steer Jev too. [Best practices](#best-practices) pairs it with a hard check so Jev can raise the risk level but never lower it.
5. Deciding when to compact, meaning summarize the conversation to free up context. See [Managing a Long Session](managing-a-long-session.md).
6. Checking that the work is verified before the agent stops.

It's only worth asking Jev when you can name the possible answers _before_ the call. If you can't list the options, you want a model that writes, not one that picks.

## Setting up Jev

There are three ways in:

- The TypeSafe API, with `TYPESAFE_API_KEY`.
- [Vercel AI Gateway](https://vercel.com/ai-gateway), as `typesafe-ai/jev` through `experimental_evaluate`.
- [OpenRouter](https://openrouter.ai).

Install TypeSafe's agent skill so Claude Code writes integrations against the _real_ API instead of guessing. ([Skills](skills.md) are packaged instructions an agent loads on demand.) Once you've tuned your thresholds, the confidence or probability cutoffs that decide when your code acts on an answer, pin `jev-1.13.0` and log the model version each response reports. Then a silent model update can't change your behavior without you noticing.

Community projects like jev-gateway, jev-kit, and jev-for-all are all unofficial and weeks old. Vet them before you install anything.

Jev is cheap enough that the temptation is to wire it in everywhere on day one. Resist that. Any classifier is wrong some of the time, and it's your job to decide what a wrong answer costs.

## Best practices

- **Questions**: Give every option a distinct description, include the full list plus an "other" escape hatch, and say _exactly_ what you mean. Jev reads literally.
- **State**: Send evidence rather than summaries, filter out irrelevant detail, and redact secrets before anything gets sent.
- **Batching**: Ask every question that shares the same state in one call: one request, not a fan-out. [Published runs](https://docs.typesafe.ai/cookbooks/parallel_questions) report it about 12 times cheaper and 10 times faster than separate calls.
- **Thresholds**: Set them per action, based on what a wrong answer would cost. One number for everything doesn't work.
- **Rollout**: Go in this order. Shadow (run Jev alongside the real decision and only record what it would have said), label (check those answers against the truth), set thresholds, add a fallback, enforce, and then monitor.
- **Failure modes**: Jev's judgments should fail _open_, so a timeout or low confidence changes nothing. Hard safety checks, like regular expressions and allowlists, should fail _closed_. Combine them as `max(floor, jev)`: the hard check sets the floor, and Jev can raise risk above it but never lower it.

## Anti-patterns

- **Treating Jev's pick as permission to act**: Choosing an action is not authorization.
- **Using the confidence threshold as your safety net**: Confidence is a signal, not a wall.
- **Asking it to do math, counting, or date comparisons**: Do those in code. And don't ask it to write anything.
- **Stale options and bloated state**: Keeping one fixed option list for a whole run, or passing the whole transcript as state.
- **Measuring cost per call**: Measure cost per completed task instead. See [Measuring whether it works](why-systems.md#measuring-whether-it-works).
- **Believing it "can't hallucinate"**: Its output always has the right _type_. It can still be confidently wrong.

## Known weaknesses

TypeSafe's own list for Jev 1.13:

- It reads questions literally and struggles with indirection and double negatives.
- It's bad at numbers, dates, and values like hex or RGB colors.
- Accuracy drops when the state is padded with irrelevant detail.
- It doesn't treat adversarial content as hostile, so injected instructions can steer it. (That's [prompt injection](the-enforcement-ladder.md#blast-radius), and it applies to Jev too.)
- It sometimes leans toward the first option in a list, which is why you shuffle the option order.

## Advanced techniques

- **Compaction decisions**: After each turn, ask four questions in one call: Did the request switch gears? Did the last turn finish a unit of work? How much of the earlier work does the next step need? Is the agent in the middle of a multi-step edit? Context size stays in code, and code decides when to compact.
- **Cheap reads**: Jev answers a question _about_ a file so the agent never loads it. [One published run](https://github.com/disler/ten-levels-of-jev) was 187 times cheaper than an expensive model reading the same file.
- **Files at scale**: Glob (match file names by pattern), prune in code, judge every file in parallel, then open only the match.
- **Skill routing**: Two calls pick at most one skill. The first ranks the candidates, and the second re-checks the top few. In [TypeSafe's test](https://docs.typesafe.ai/cookbooks/skill_suggestion), wrong skill loads dropped from 16.8% to 7.3%.
- **Cascades**: A cheap model drafts, Jev checks each part, and the work goes to an expensive model only if a flag fires.
- **Tier guard**: Block dispatches that send a [subagent](subagents.md), a helper agent with its own fresh context, to a model tier well above what the task needs.
- **Agentic Jev**: Give the agent an `ask_jev` tool and let it write its own questions.
- **Observability**: Rerun questions and shuffle the option order to check consistency, and record a receipt for every decision.

## Where to start

Pick one frequent, reversible decision. A Bash command gate is a good candidate. Run it in shadow mode behind a `PreToolUse` [hook](hooks.md) that fails open, calibrate on labeled cases, and _then_ enforce. Only then move on to the next decision.

## Check the numbers yourself

Most of the speed and cost figures above come from TypeSafe or the authors themselves. In [independent tests](https://dev.to/gde/jev-after-eight-days-of-independent-tests-level-with-mid-price-llms-behind-the-frontier-1kln), Jev trailed frontier models on harder tasks: 61.8% versus 79.1% on invoice processing, and six of seven planted defects found versus seven of seven.

Jev is for the decisions you can enumerate. Treat it as a fast, cheap first opinion, and keep the final say with a human or a deterministic check you trust more.
