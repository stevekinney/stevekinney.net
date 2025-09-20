---
title: Using NotebookLM for AI Development
description: >-
  Leverage Google's NotebookLM for research, documentation analysis, and
  knowledge synthesis in AI projects.
modified: '2025-09-06T13:33:06-06:00'
date: '2025-07-29T15:09:56-06:00'
---

![NotebookLM](assets/notebooklm.png)

NotebookLM is Google's AI-powered research and note-taking workspace. You create a notebook, attach sources (Google Docs, PDFs, URLs, Drive files), and then ask questions, generate summaries, outlines, glossaries, and study guides that are grounded in those sources with citations. It's super useful for turning sprawling documentation into concise, reliable knowledge that you can share with a team.

For engineering work, NotebookLM shines as a “source-of-truth synthesizer” for product specs, API docs, RFCs, onboarding guides, READMEs, and incident retros. It won't write code or run tests, but it will help you and your collaborators understand complex systems faster and produce high-quality, source-cited docs you can hand to AI coding tools like Cursor or Claude Code.

## Why Developers Should Use It

- **Source-grounded answers:** Ask questions across attached docs and get concise answers with inline citations to the exact passages.
- **High-signal summaries:** Generate chapter overviews, study guides, and glossaries to quickly absorb a codebase, service, or library.
- **Documentation accelerator:** Draft onboarding guides, API quickstarts, ADR summaries, or upgrade/migration checklists directly from official docs.
- **Team knowledge hub:** Share notebooks, keep them updated with new sources, and export results to Google Docs for broader distribution.
- **Prompt-ready outputs:** Convert summaries and key constraints into rules, notepads, or prompts for Cursor and Claude Code.
- **Audio overview:** Auto-generate a narrated, shareable overview for stakeholders to absorb the essentials in minutes.

## Core Concepts

- **Notebook:** A workspace that contains your sources, notes, and generated artifacts (summaries, excerpts, questions/answers).
- **Sources:** Google Docs, PDFs, web pages, and Drive files. NotebookLM ingests and indexes these for retrieval with citations.
- **Citations:** Every generated claim links back to specific source passages, encouraging verifiability and trust.
- **Artifacts:** Study guide, outline, glossary, Q&A, and audio overview—each can be refined and exported.

## Typical Developer Workflows

### New Codebase or Service Ramp-up

1. Create a notebook named after the service or repo.
2. Add sources: README, architecture doc, ADRs, API spec, runbooks, migration notes, past incident postmortems.
3. Ask: “Give me a high-level architecture overview. Cite components and responsibilities.”
4. Generate a glossary and study guide; pin key sections as notes.
5. Export a concise “Engineering Brief” to Google Docs for teammates.

### API Integration or SDK Upgrade

1. Add sources: official API docs, migration guide, changelog, example requests.
2. Ask: “Summarize breaking changes from v2→v3 and provide a step-by-step migration checklist with citations.”
3. Generate an outline for a PR description and release notes.
4. Export or copy the checklist into your issue tracker.

### Onboarding and Runbooks

1. Add onboarding docs, architecture overview, on-call runbooks, and incident retros.
2. Ask: “Create a first-week onboarding plan with links to essential docs and example tasks.”
3. Generate an audio overview for new hires; export the written plan to Docs.

### Comparative Research (Frameworks/Libraries/Services)

1. Add official docs and benchmarks for candidates (e.g., two ORMs or queue systems).
2. Ask for a comparison table focusing on your constraints: performance, ecosystem, licensing, migration cost.
3. Use citations to validate claims before making a choice.

## Integrating with Cursor and Claude Code

- **Create a “brief” for agents:** Use NotebookLM to produce a concise system overview (constraints, conventions, key files) and paste it into `.cursor/rules` or `CLAUDE.md`.
- **Notepads/commands:** Turn NotebookLM's checklists and procedures into Cursor Notepads or Claude slash commands for repeatable workflows.
- **Context handoff:** When asking an AI coding tool to implement changes, include the brief plus links back to exported NotebookLM docs to keep work grounded.

> [!NOTE] Grounding improves reliability.
> NotebookLM's grounded outputs—with citations—make it easier to keep AI coding assistants aligned with your actual architecture and policies. Always spot-check citations before turning results into rules or prompts.

## Quick Start

1. Create a new notebook; name it after the project or domain.
2. Add 5–10 core sources (canonical docs first; keep noisy content out).
3. Ask 3–5 high-leverage questions you'd ask a senior teammate.
4. Generate a study guide and glossary; refine iteratively.
5. Export a concise brief; copy key constraints into your AI tool rules.

## Tips and Best Practices

- **Favor canonical docs:** Prioritize official documentation, ADRs, and READMEs; avoid duplicative or opinionated blog posts unless needed.
- **Chunk large PDFs:** If parsing is inconsistent, split long PDFs by chapter or export them to Google Docs for cleaner text.
- **Refresh regularly:** Re-upload or replace outdated sources when versions change; keep a “Changelog” note in the notebook.
- **Track decisions:** Use notes to capture decisions, open questions, and links to issues/PRs.
- **Export for sharing:** Publish to Google Docs for teammates without NotebookLM; link these docs in your repo.
- **Security & privacy:** Don't include sensitive credentials or proprietary materials you're not permitted to upload.

## Limitations

- **No code execution:** NotebookLM won't run code, tests, or commands; it's for understanding and documentation.
- **Scope-bound answers:** Best when questions are inside the attached sources; outside queries can degrade quality.
- **Parsing variance:** Complex PDFs or generated docs may parse imperfectly; prefer clean Docs/HTML when possible.
- **Size/quantity limits:** Very large or numerous sources may need trimming to the essentials.

## Prompts to Try

- “Summarize the system architecture, list core services, and note cross-service dependencies. Include citations.”
- “Extract all APIs with required/optional params and produce a quickstart for the three most common operations.”
- “From the retros and runbooks, list the top 10 recurring failure modes and the fastest mitigation steps.”
- “Create an onboarding study guide for a new engineer joining this team. 30-minute read.”
- “Generate a migration checklist from framework v1→v2, highlighting breaking changes and testing strategy.”

## Hand-off Pattern to Coding Assistants

1. Use NotebookLM to create a 1—2 page Engineering Brief with citations.
2. Paste the brief into `.cursor/rules` or `CLAUDE.md` and link the exported Doc.
3. In Cursor/Claude, start tasks with: “Follow the Engineering Brief. If unsure, ask and cite.”
4. Keep the brief current by refreshing sources as the system evolves.
