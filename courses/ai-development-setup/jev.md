---
title: Jev
description: 'Jev answers typed questions with a choice, a score, or a probability, never text. The LLM writes, Jev decides, code acts. Costs, limits, and setup.'
---

Most of what a coding agent does is not writing. It's deciding. Which skill applies? Is this command safe? Is the work verified? Should we compact now? Today we make those calls by asking a large model to write a paragraph and then hoping the answer parses. That's slow, expensive, and a little silly for a question with three possible answers.

**Jev** is TypeSafe AI's first "System One" model. (The name comes from Kahneman's fast, intuitive System 1 thinking, as opposed to slow, deliberate reasoning. It's TypeSafe's name for models that make fast, structured decisions instead of generating text.) It was [launched September 15, 2026](https://typesafe.ai/blog/introducing-system-one-models-and-jev). It never generates text or code. You give it state and typed questions, and it returns choices, scores, or yes-probabilities, with calibrated confidence (meaning its stated confidence is meant to match how often it's right).

The short version: the LLM writes, Jev decides, and code acts.

## The three question types

- **Choice**: Picks one option, out of up to 255.
- **Score**: Places the state on an ordered rubric of 2 to 10 levels.
- **Noul**: A yes/no question. It returns the probability that the answer is yes, as a number from 0 to 1.

## Pricing and limits

It costs $0.042 per million input tokens, and output tokens are free. Calls take 70 to 500 milliseconds. A request can be up to 64,000 tokens. It's text-only and strongest in English.

Those numbers are as of October 2026. The shape matters more than the digits: a call is cheap and fast enough to sit inside the loop.

## Where Jev fits in agentic coding

It's not a coding model, and there's no setting that turns your agent into a "Jev agent." There are two ways to use it. Your agent can build apps that call Jev. Or Jev can sit inside the agent's own harness through hooks (scripts the harness runs at lifecycle events), gateways (proxies between your agent and the model providers), or plugins.

Inside the harness, the decision points look like this, in loop order:

1. Routing a request to a model or agent.
2. Picking a skill and a subset of tools.
3. Gating each tool call before it runs. That's the `PreToolUse` [hook](hooks.md) event, which fires before a tool runs and can block it.
4. Screening tool output for injected instructions. That's a cheap first-pass signal, not a security boundary. Jev can itself be steered by injected text, which is why [Jev in Practice](jev-in-practice.md) combines it with a hard check as `max(floor, jev)`, so Jev can raise the risk level but never lower it.
5. Deciding when to compact the context, the harness's summarizing of the conversation to free up room. See [Managing a Long Session](managing-a-long-session.md).
6. Checking that the work is verified before the agent stops.

It's only worth asking Jev when you can name the possible answers _before_ the call. If you can't list the options, you want a model that writes, not one that picks.

## Setting up Jev

There are three ways in:

- The TypeSafe API, with `TYPESAFE_API_KEY`.
- [Vercel AI Gateway](https://vercel.com/ai-gateway), as `typesafe-ai/jev` through `experimental_evaluate`.
- [OpenRouter](https://openrouter.ai).

Install TypeSafe's agent skill ([skills](skills.md) are packaged instructions an agent loads on demand) so Claude Code writes integrations against the _real_ API instead of guessing. Pin `jev-1.13.0` once you've tuned your thresholds (the confidence or probability cutoffs that decide when your code acts on an answer), and log the model version that each response reports. That way a silent model update can't change your behavior without you noticing.

There are plenty of community projects: jev-gateway, jev-kit, jev-for-all. They're all unofficial and weeks old. Vet them before you install anything.

Read [Jev in Practice](jev-in-practice.md) before you wire it into anything that blocks a command.

Jev is for the decisions you can enumerate. Let it choose, and keep a human or a deterministic check in charge of what gets allowed.
