---
title: AI Development Setup
description: 'Design the system your coding agents work inside: task contracts, verification, skills, subagents, hooks, loops, worktrees, and blast radius.'
date: '2026-10-04'
---

You might not be writing as much of the code anymore—or _any_ of it. But, you're still in charge of the system that produces it. That system is the thing worth designing, and it's what this course is about.

The model is the part everyone argues about. I care a lot more about everything around it: the tools the agent can use, the information it starts with, what survives from one conversation to the next, and—most of all—the checks that decide whether it actually did the thing. Get those right and you can swap models without much drama. Get them wrong and no model will save you.

We'll use [Claude Code](https://code.claude.com/docs/en/overview) as the default **harness**—the program wrapped around the model that gives it tools, permissions, and **context** (everything the model can see when it decides its next step: your messages, its instructions, and every file or command output so far). I'll call out where OpenAI's [Codex](https://developers.openai.com/codex), another harness, does things differently. The tools are converging fast, so most of what you learn here carries over to whatever you use.

The course moves through five arcs:

- **Foundations**: Why systems beat clever prompts, how to plan a task, how to tell real evidence from a convincing story, what context costs, and how to write instruction files.
- **Primitives**: The building blocks. Skills (packaged instructions the agent loads on demand), subagents (helper agents it hands work to), agent teams (subagents that can message each other), hooks (scripts that run automatically at set points), and how to review what all of them produce.
- **Automation**: Running agents without you at the keyboard. Scripted workflows, goals and loops, scheduled routines, the Ralph loop (a fresh agent per task, restarted in a loop), and the files that hold state between runs.
- **Boundaries**: Running several agents at once in separate Git worktrees (extra checkouts of the same repository, so each agent gets its own copy of the files), letting agents talk to each other, pairing Claude Code with Codex, measuring whether any of this helps, and limiting the blast radius—how much damage an agent can do when something goes wrong.
- **Extensions**: Claude Code mods (plugins that run inside Claude Code's own process) and Jev, a model that never writes text or code. You hand it a fixed list of options or a rating scale, and it picks an option or a rating.

> [!NOTE] Prices, model names, and version numbers move quickly
> Everything here reflects the tools as of October 2026. The principles have held steady for a while now. The specific numbers won't.
