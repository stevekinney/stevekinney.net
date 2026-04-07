---
title: Self-Testing AI Agents
description: >-
  Build the feedback loops that let coding agents catch their own mistakes—Playwright,
  visual regression, runtime probes, custom MCPs, review bots, a static layer, and CI—so
  you stop being the verification step.
layout: page
date: 2026-04-06
modified: 2026-04-06
---

Agents are fast at editing code. They are not particularly good at knowing whether the edit was any good. If every change they make requires you to read the diff, run the thing, click around the UI, eyeball the console, and then prompt the agent to fix what it missed, you haven't automated much. You've traded one kind of typing for another.

This workshop is built on a single bet: **the bottleneck isn't the agent's intelligence, it's that we keep making ourselves the feedback loop.** If the agent could run lint, types, unit tests, an end-to-end probe, a visual diff, and a second-opinion review on its own, it would catch most of its own mistakes before we ever saw them. Our job is to make it cheap and automatic for the agent to check its own work.

Every lab runs against the same starter project: **Shelf**, a small SvelteKit + TypeScript book-rating app with Vitest and Playwright already wired in. You'll harden it across the day—adding a `CLAUDE.md`, a static layer, dossiers, visual regression, and CI—until it's the codebase the rest of the workshop assumes.

The day moves in three beats. First, **prove the UI behaves**: locators and the accessibility hierarchy, the waiting story, storage state, HAR recording, deterministic state, hybrid API+UI tests, and visual regression as a live signal. Then, **get a second opinion**: review bots, tuning Bugbot for your codebase, and what to do when the same flag shows up three times in a row. Finally, **underlay the cheap stuff and ship it**: lint and types as guardrails, dead code detection, git hooks, secret scanning, and wiring the whole stack into CI so it runs without a human in the room.

By the end, you'll have a Shelf you can hand to an agent and trust to come back red when it should.
