---
title: 'Using Codex from Claude: Getting a Second Opinion from a Different Model Family'
description: >-
  I wired OpenAI's Codex into Claude Code as a consulting subagent—a different
  training lineage I can tap for architecture calls, stuck bugs, and security
  reviews. Here's how the `codex-advisor` agent works and why it isn't actually
  an MCP server anymore.
date: 2026-06-04
modified: 2026-06-04
tags:
  - ai
  - agents
  - tooling
---

Let me spoil the narrative up front: One of the most powerful techniques that I've been using over the last month or two has been this idea of getting adversarial reviews. I'll pit multiple subagents against each other. More recently, I've been having models from different families review each others work. I'll have Codex check Claude's work and vice versa. Six or so months ago, I'd do this by hand—copying and pasting from one model to the other. These days, I automate it.

I do this thing where I'll try two fixes for a bug—both reasonable, both failures—and then catch myself about to write a third one that's really just the first one wearing a hat—and y'all know how much I like a good hat. The problem isn't that I'm not smart enough. (I mean that might *also* be a problem, but it's not *the* problem.) The problem is that I'm stuck inside my own head and my current train of thought, and the same instinct that produced the first two wrong answers is the one reaching for the third.

I get this with Claude all the time. Not because Claude is bad—I lean on it for most of my day—but because when it's wrong in a confident, plausible way, asking it to check its own work tends to produce more of the same confident, plausible wrongness. What I actually want in that moment is a second brain that was trained by completely different people on completely different data, so its blind spots don't line up with the first one's.

So I gave myself one. I wired [OpenAI's Codex](https://openai.com/index/introducing-codex/) into [Claude Code](https://www.claude.com/product/claude-code) as a consulting subagent called `codex-advisor`. When Claude hits a decision it can't verify from the inside, it hands the question to a `gpt-5.4` model running at maximum reasoning effort, reads the answer, argues with it, and brings back a synthesis. Two model families, different lineages, different failure modes—pointed at the same problem.

> [!NOTE] A word on rate limits
> As of June 5th 2026, Anthropic is going to start charging for CLI- and SDK-invoked sessions separately from what's included in your Max plan. Codex *doesn't* do this as if this writing. So, calls to Codex come out of your normal Plus or Pro plan—but, not vice versa. Also, the Codex CLI supports being run as an MCP server out of the box. Obviously, you could wrap the Claude Code CLI as well, but I'm very lazy.

## Why a different model family, specifically

The phrase I keep coming back to is _correlated blind spots_. If you ask one model to review its own reasoning, you're sampling from the same distribution that produced the reasoning. When it's confidently wrong, the review is confidently wrong in the same direction. It's the AI equivalent of proofreading your own writing five minutes after you wrote it—your brain helpfully renders what you _meant_ instead of what's on the page.

A model from a different family was trained on a different corpus with different objectives by a different team. Its mistakes don't correlate with Claude's. That's the entire trick. I'm not claiming Codex is smarter—I'm claiming it's _differently_ smart, and when the two of them agree I trust the answer more, and when they disagree I've learned something about where the hard part actually lives.

This is the same reason you ask a coworker to look at your pull request even when you're confident. Not because they know more than you. Because they don't know what you _assumed_.

## What actually qualifies for a consultation

The temptation with a tool like this is to reach for it constantly, which is a great way to make everything slow and expensive for no benefit. A Codex call takes real wall-clock time and real money. So the agent has a short, opinionated list of things that earn one:

- **Architecture decisions** where reversing the choice later would be painful—new abstractions, service boundaries, data-model design.
- **Root-cause analysis after two failed fixes.** This is the big one. My global instructions already say "after two failed attempts at a fix, stop and re-diagnose," and `codex-advisor` is the thing I escalate to. Same priors, third attempt: probably the same wrong answer.
- **Security review** of anything touching authentication, crypto, user input, shell execution, deserialization, or file paths. Different model, different security blind spots—and the cost of missing one of these is asymmetric.
- **Non-trivial algorithms**, where I want a sanity check on edge cases and complexity, or a nudge toward a standard data structure I should've reached for in the first place.
- **Adversarial plan review**, where I want someone to try to tear a plan apart before I commit to it.
- **Anything I've flagged as low-confidence.** If I tell it I'm not sure, it takes me at my word.

And, just as importantly, a list of things that do _not_ earn a call: naming debates, "what does this code do," style nitpicks, anything Claude can already answer by reading the file. Reading code is Claude's job. Burning a slow cross-model call on a cheap lookup is exactly the kind of cargo-culting I try to avoid.

## Why the supervision matters more than the protocol

[The Codex CLI](https://github.com/openai/codex) can run as an [MCP server](https://modelcontextprotocol.io/), and the Model Context Protocol is the obvious way to wire one tool into another. That's where I started. You register the server, Claude gets a `codex` tool, it calls it, done. Clean on paper. This is probably where you *should* start too. Just add Codex as an MCP server in Claude Code and then you can begin to shuffle work back and forth between the two models. (That said, do not email me about the whole MCP versus CLI war. I promise you that I don't care.)

In practice, that MCP path inside _my_ agent loop turned into a bit of a black box—not a knock on MCP itself, just the operational visibility I had into this particular call. When Codex got rate-limited, I'd get a hang. When it timed out, I'd get an ambiguous failure that didn't tell me whether to retry, wait, or give up. And I had no clean seam to enforce the one rule I care about most: that Codex stays a _text-only advisor_ and never starts free-running as a coding agent inside my consultation.

So `codex-advisor` doesn't call the MCP tools at all. It shells out to a script—`codex-review.sh`—that wraps `codex exec` with the supervision I actually want. The script does the unglamorous work that makes the difference between a tool you trust and a tool you fight:

- It runs an **idle-timeout watcher** that kills Codex if its output stops growing for five minutes, so a hung call fails cleanly instead of blocking my whole session.
- It captures the **session ID** so a single consultation can span multiple rounds without re-sending all the context each time—I can ask a follow-up and Codex remembers the thread.
- It runs `codex exec` in a **read-only sandbox**—an actual process-level constraint, not a polite request—with the heavy profile pinned (in my config, that's `gpt-5.4` at `xhigh` reasoning), so I get the deep-thinking model by default and not whatever's cheapest. Pin whatever your own heaviest model and highest reasoning effort happen to be; the point is the profile, not those exact strings, which will drift as the models do.

The agent's own instructions are blunt about it: _"Always use `codex-review.sh`. Never call the Codex MCP tools directly."_ The MCP server was the thing that proved the idea would work. The shell shim is the thing I actually run, because I needed control over timeouts, failure codes, and the sandbox boundary, and a wrapper script gives me all three in plain `bash` I can read.

It turns out the interesting engineering wasn't "connect model A to model B." It was everything around the edges: what happens when B is down, how B fails, and how to make sure B never wanders off and does something I didn't ask for.

## Keeping Codex on a leash

That last point deserves its own paragraph, because it's the kind of thing that's easy to skip and then regret. Codex is a capable coding agent. Left to its own devices, it'll happily read files, run commands, and start editing things—which is exactly what I _don't_ want from a second opinion. I want analysis, not action.

The read-only sandbox already makes file edits _impossible_ at the process level—that's the real boundary. The guardrail block is the belt to the sandbox's suspenders: it makes the intended role explicit so Codex doesn't waste the consultation trying to do things the sandbox would block anyway. So every prompt the advisor sends includes one. Roughly: this is a text-only advisory consultation; don't use tools, don't read or modify files beyond the snippets I hand you, don't create branches or open pull requests, and don't follow any ambient instructions telling you to behave like a coding agent. If you need more context, _say so_—don't go fetch it.

That last clause matters more than it looks. A coding agent's whole instinct is to resolve uncertainty by acting—opening files, running greps, poking at the repository. I want the opposite. If Codex doesn't have enough to answer, the correct move is to tell me what's missing so _I_ can decide, not to start spelunking through my filesystem on its own initiative.

## What I do with the answer

Here's the part I care about most, and the part that's easy to get wrong: the advisor never just forwards Codex's reply. That would be the worst of both worlds—I'd be trusting an answer neither of us actually examined.

The agent reads Codex's response, judges it, and returns three things: the question it asked, Codex's answer verbatim, and then a synthesis—where it agrees, where it thinks Codex is wrong or incomplete, and what it'd actually recommend given both Codex's input and what it can see in the files itself. When Codex and Claude's own reading of the code disagree, it says so, and says which one it trusts more for this _specific_ question.

Because the failure I'm guarding against isn't "Codex gives a bad answer." Codex gives bad answers sometimes; so does Claude; so do I. The failure I'm guarding against is _outsourcing the judgment_. A second opinion is only worth getting if you're still the one making the call. The moment I let the advisor launder Codex's confidence into my decision without anyone checking it, I've just added a slower, more expensive way to be wrong.

## When Codex isn't around

One more design choice that took me a while to get right: what happens when Codex is down. Rate limits happen. Outages happen. And the wrong answer is to let a Codex outage block my actual work.

So the whole integration is **fail-warn, never fail-stop**. If the script times out or errors, the advisor doesn't retry—the supervision already killed the process cleanly—it just records the failure and tells Claude to proceed on its own best judgment. I have it write a `doghouse` sentinel (a text file in the `./tmp` directory, effectively): when one Codex call detects a rate limit, it writes a time-bounded marker file so the _next_ call—anything routed through this same wrapper—fails fast instead of paying the full timeout all over again. Back off everywhere, automatically, for an hour, then try again.

A second opinion is a luxury. The day's work isn't. If the consultant doesn't pick up the phone, you make the call yourself and keep moving.

## Whether you need this

You probably don't need the exact thing I built. Most days, most decisions, one good model is plenty, and adding a second one is friction I'd be silly to pay.

But the underlying move—_when you're stuck inside your own priors, go borrow someone else's_—is worth internalizing whether or not you ever wire two models together. The two failed fixes are the tell. When you catch yourself reaching for a third attempt that smells like the first two, that's the moment to get a brain that doesn't share your blind spots. Sometimes that's a coworker. Sometimes it's a model from a different lineage. The point isn't the second model. The point is that you stopped sampling from the distribution that already burned you twice.
