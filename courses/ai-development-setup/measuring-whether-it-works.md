---
title: Measuring Whether It Works
description: 'You are a poor judge of whether your agent workflow helps. Measure time to accepted result, rework, and cost per result, and audit your session logs.'
---

Here's the uncomfortable part: you are not a reliable instrument for judging whether your workflow is helping. It feels fast. Agents produce a lot of output, and a lot of output feels like progress.

## What METR found

In [METR's randomized trial](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/), experienced open-source maintainers were 19% _slower_ with AI tools allowed, after forecasting a 24% speedup. When they finished, they _still_ estimated they'd been 20% faster.

Don't read that as "AI makes you slower." It's early-2025 tooling, and METR has since [walked its own numbers back](https://metr.org/blog/2026-02-24-uplift-update/). The part that survives is narrower and more useful: the perception error kept its sign even after the work was done. Doing the task is not a measurement of the task.

## What to measure

- **Time to accepted result**: Not time to first draft. A draft that needs three rounds of fixes isn't done.
- **Rework rate**: How often a human has to touch the work afterward. [One report on dotnet/runtime](https://devblogs.microsoft.com/dotnet/ten-months-with-cca-in-dotnet-runtime/) found human commits in 52.3% of merged agent pull requests, versus 10.3% of merged human pull requests.
- **Review minutes**: How long a person spends reading what the agent produced. This is where the hidden cost lives.
- **Cost per accepted result**: Not cost per run. A cheap run that gets thrown away is expensive.
- **Escaped defects**: Bugs that made it past review and into production.

## What not to measure

- **Lines of code**: More code isn't more value.
- **Suggestion acceptance rate**: It goes _up_ when you stop reading.
- **Raw token counts**: They measure activity, not outcome.
- **The number of agents you have running**: That's a hobby, not a metric.

Pick one measure of success before you start (say, time to accepted result), and record a baseline for it. Remember that "15% faster on five tasks" is noise. "We didn't measure it" is a perfectly legitimate verdict. "I feel faster" isn't.

## Audit your own sessions

If you want to know what's actually happening, read your session logs: the transcripts that Claude Code and Codex save to disk. Or, more realistically, have agents do it. I did exactly that across 12,965 of my own sessions. Scripts pulled out and compressed each session, models proposed findings with a quote from the log as evidence, and verifier agents checked those findings. Here's what I learned:

- **Scripts parse; models read digests**: Deterministic code extracts, redacts, and compresses the logs. The models only ever see the compressed version.
- **Every quote must appear verbatim in its source**: About 16% of them didn't.
- **Every proposed check must be shown failing first**: One verifier proposed a check that passed on the exact hook (a script the harness runs automatically at a lifecycle event) it was supposed to prove was broken. A check that has never failed hasn't proven anything. (See [Verification and Evidence](verification-and-evidence.md).)
- **Models don't do arithmetic**: When models merged overlapping findings, they added up the session counts, so the same sessions got counted twice. One count came back as 436 when the real number was 95. Carry the sets of session IDs and count in code.
- **Keep a control row**: Include a problem you already fixed in every report. It should stay at zero, and if it creeps back up, something regressed.

I also scored my own setup against the claims my notes make about how an agent setup should work. Observability came out as my _least_-implemented area: 5 of 56 applicable claims. I write about measuring a lot more than I measure.

## The pattern

Almost everything I got wrong was one mistake wearing different outfits: I treated writing something down as the same as doing it. A rule in [`CLAUDE.md`](user-and-project-instructions.md) (the instruction file Claude Code loads into context at the start of every session), a decision in a note in my [Obsidian](https://obsidian.md) vault, or a closed [Linear](https://linear.app) issue. Each one _felt_ like the problem was handled.

If it matters, make it executable. Then go look at the logs to see whether it actually stopped.
