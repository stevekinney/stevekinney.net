---
title: Authoring Notes
description: Internal editorial rules for contributors to the Self-Testing AI Agents course. Not listed in index.toml and not published to students.
date: 2026-04-14
modified: 2026-04-14
---

# Authoring Notes — Self-Testing AI Agents

Internal notes for editors and future contributors. Not listed in `index.toml`, so students do not see it.

## Talking about Shelf

The course walks students through a real app (Shelf). It starts small and grows across the labs. Two things tend to drift:

1. Describing Shelf as if later-lab artifacts already exist.
2. Using language like "Shelf no longer ships X," which assumes the student has seen a prior version.

Use this convention to avoid both:

- **"The Shelf starter"** — the repo as the student clones it. This is the default baseline for any non-lab lesson.
- **"The completed Shelf loop"** — the repo after all relevant labs are done. Use this phrase when the distinction matters (for example, when a lesson walks through a finished CI config that the student will only build later).

Rules:

- Do **not** use "day-one" as a modifier. It has no meaning for a first-time reader.
- Do **not** write "Shelf no longer ships X." Students have no prior version to compare against. Write "The Shelf starter doesn't ship X" instead.
- When a lesson uses a file the later labs create (for example, `tests/fixtures/*.har` or `sample-config.json`), say so explicitly: "the [static-layer lab](lab-wire-the-static-layer-into-shelf.md) has you create `sample-config.json`."

## Fixture locations

One convention, used everywhere:

- `tests/data/` — seed JSON shipped with the Shelf starter (e.g., `tests/data/users.json`).
- `tests/fixtures/` — HARs and other test artifacts created during the HAR labs.

Do not mix these. Seed data never lives under `tests/fixtures/`, and HAR recordings never live under `tests/data/`.

## Skills, rules, and hooks

When teaching a feedback-loop pattern, say whether it belongs at the rules layer (CLAUDE.md), the skills layer (`.claude/skills/`), or the hooks layer (`.claude/settings.json`). See [Skills, Rules, and Hooks](skills-rules-and-hooks.md) for the taxonomy. Default to the cheapest layer that enforces the intent — a lint rule beats a CLAUDE.md bullet, a CLAUDE.md bullet beats a skill, and a skill beats a hook _unless_ bypass cost is high.
