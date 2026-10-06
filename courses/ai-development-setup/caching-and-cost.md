---
title: Prompt Caching and Cost
description: 'Every model request re-sends the whole conversation, so context is what you pay for. Learn how caching cuts the bill and how to pick a model per job.'
---

When you wrote all of the code by hand, your real constraint was time, and how many energy drinks you could drink before your body insisted you go to bed. Now you have a different ceiling: the limits on your plan, or a finite amount of money. (With infinite money, you're back to time.) That makes cost a design constraint, not a footnote.

## You pay twice

With an LLM, you pay for two things:

- **Input tokens**: what you send in. (A _token_ is a chunk of text a model reads or writes, usually a word or part of one.)
- **Output tokens**: what the model sends back.

Every request the harness sends to the model carries the entire conversation so far _and_ the new text. A _turn_ (one response to a message you send) can involve many requests, because the agent goes back to the model after each tool result. So the whole history is resent per request, not per turn. That's why a long session costs more than a short one.

**Prompt caching** lets the provider remember the part of your input it has already processed, so it charges a fraction of the normal input price for reading those messages back. Writing the cache in the first place costs a bit more than normal input on Claude: about 1.25× for the five-minute cache and 2× for the one-hour cache. It's easy to accidentally opt out of the savings, and a growing conversation still means a growing bill. Caching makes context cheaper, not free. The Claude Code documentation on [prompt caching](https://code.claude.com/docs/en/prompt-caching) and [managing costs](https://code.claude.com/docs/en/costs) goes deeper.

### What invalidates the cache

- **Switching models**: The cache is typically bound to one model. Switch, and you start over.
- **Waiting too long**: A cache entry expires after a stretch of inactivity, and that stretch is an hour—_sometimes_. You get an hour for your main conversation on a Claude subscription, within your plan's included usage. With an API key, usage credits (pay-as-you-go billing past your plan's limit), or a cloud provider, it's five minutes. Everything outside the main conversation gets five minutes even on a subscription: subagents (helper agents the main agent hands work to), workflows, teammates, forks (copies of a conversation), and compaction (replacing the conversation so far with a summary). Compaction's summarization request _reads_ your main conversation's cache, though, so the main cache's lifetime decides whether a compaction is cheap. Setting `subagentPromptCacheTtl` to `1h` in your Claude Code settings extends all of those, despite the name, though one-hour writes cost more. Coming back the next morning? It's gone either way.
- **Changing effort levels, sometimes**: Changing effort (how hard the model thinks) used to invalidate the cache. With Fable 5.1, Opus 5.5, and Sonnet 5.5 on an API key or a Claude subscription, it no longer does. That doesn't hold if you reach Claude through Amazon Bedrock, Google Cloud's Agent Platform, or a self-hosted Claude apps gateway (a proxy your organization runs between developers and the API), or if you've set `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` or have a HIPAA configuration. If none of that sounds like you, skip it.

## Model costs

Prices are in dollars per million tokens. "Cached input" is the price of _reading_ a cache hit. The `≤200K` and `<200K` rows are the tier for requests up to about 200K tokens of context. DeepSeek publishes separate peak and off-peak rates.

| Model                             | Uncached input | Cached input | Output | 1M in + 1M out |
| --------------------------------- | -------------: | -----------: | -----: | -------------: |
| **GPT-6 Astra**                   |         $10.00 |        $1.00 | $50.00 |     **$60.00** |
| **Claude Fable 5.1**              |         $10.00 |        $0.25 | $50.00 |     **$60.00** |
| **Claude Opus 5.5**               |          $4.00 |        $0.20 | $20.00 |     **$24.00** |
| **Kimi K3**                       |          $3.00 |        $0.30 | $15.00 |     **$18.00** |
| **Gemini 3.1 Pro Preview** ≤200K  |          $2.00 |        $0.20 | $12.00 |     **$14.00** |
| **GPT-6.1 Sol**                   |          $2.00 |        $0.10 | $10.00 |     **$12.00** |
| **Claude Sonnet 5.5**             |          $2.00 |        $0.20 | $10.00 |     **$12.00** |
| **Grok 4.7** <200K                |          $2.00 |        $0.50 |  $6.00 |      **$8.00** |
| **Qwen3.8-Max**                   |          $1.65 |       $0.206 | $4.951 |     **$6.601** |
| **Claude Haiku 4.5**              |          $1.00 |        $0.10 |  $5.00 |      **$6.00** |
| **GLM-5.3**                       |          $1.40 |        $0.26 |  $4.40 |      **$5.80** |
| **DeepSeek V4 Pro**, peak         |          $1.32 |       $0.044 |  $3.96 |      **$5.28** |
| **Kimi K2.7 Code**                |          $0.95 |        $0.19 |  $4.00 |      **$4.95** |
| **Gemini 3.8 Flash**              |          $0.75 |       $0.075 |  $3.75 |      **$4.50** |
| **Gemini 3.5 Flash-Lite**         |          $0.30 |        $0.03 |  $2.50 |      **$2.80** |
| **DeepSeek V4 Pro**, off-peak     |          $0.66 |       $0.022 |  $1.98 |      **$2.64** |
| **DeepSeek V4.1 Flash**, peak     |          $0.30 |       $0.006 |  $1.20 |      **$1.50** |
| **DeepSeek V4.1 Flash**, off-peak |          $0.15 |       $0.003 |  $0.60 |      **$0.75** |
| **GLM-5.3-Flash**                 |          $0.15 |        $0.03 |  $0.50 |      **$0.65** |
| **GPT-6 Luna**                    |          $0.10 |        $0.01 |  $0.50 |      **$0.60** |
| **Qwen3.8-Flash**                 |         $0.113 |       $0.014 | $0.382 |     **$0.495** |

> [!NOTE] Prices and model names move quickly
> These are October 2026 numbers. Treat the ratios as the lesson, not the exact figures.

Compare the two input columns. Claude Fable 5.1 charges $0.25 for cached input and $10.00 for uncached. That gap is why a warm cache matters.

### Choosing the right model

High-level, somewhat hand-wavy advice:

- **Everyday execution**: Sol or Sonnet.
- **Difficult, sustained, or ambiguous work**: Astra, Opus, Fable, or Kimi K3.
- **Bounded, high-volume transformations**: Luna or Haiku.
- **Mixed media workflows** (tasks that mix text with images, audio, or video): Gemini.

By "bounded, high-volume transformations," I mean classification, extraction, routing, tagging, short summaries, and narrowly scoped coding or research subtasks: clear instructions and a cheaply checkable result. "Extract the relevant fields and identify their source passages" beats "Determine which of these conflicting sources is ultimately correct."

To pick a model per workflow stage, see [Configuring Subagents](subagent-configuration.md).

## Leveraging existing research

- **Fork a conversation**: Do your stable research up front, then fork that conversation (copy it at its current point) into each task. In Claude Code, `/branch` moves you into a copy, and `/subtask` runs a side task in a subagent that starts with a copy. Each branch shares the same history and cached prefix. [Subagents](subagents.md) covers when forking beats starting fresh.
- **Durable research**: Dedicate a session to research and capture the results somewhere durable, even a text file. I use [Obsidian](https://obsidian.md) as my second brain (a personal notes system), which lets me audit and tweak the research.

## Tasting notes on workflow economics

- A long session costs more per request than a short one, but a long, stable session _may_ be cheaper than many cold starts (new sessions that each rebuild the same context from an empty cache).
- Fresh workers (subagents that start from an empty context) buy isolation but can repeat context costs.
- Dynamic routing (picking a model per task automatically) can cut model cost while losing cache reuse.
- Don't be religious about this. Switching from Astra to Luna saves more than the cache you discard.

Once a session gets long, the question becomes what to do with the context. That's [Managing a Long Session](managing-a-long-session.md).
