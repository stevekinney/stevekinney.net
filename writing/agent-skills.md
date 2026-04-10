---
title: Agent Skills, Stripped of Hype
description: >-
  Agent skills are not a new capability—they're a context management strategy.
  Their value comes from routing and progressive disclosure, not from smarter
  prompts.
date: 2026-03-17
modified: 2026-03-17
tags:
  - ai
  - tooling
---

Agent skills are not a new capability—they're a context management strategy. Their value comes from routing and progressive disclosure, not from "smarter prompts." You're not making the model more capable by handing it a skill. You're deciding what it should know, when it should know it, and how to prove the work is done.

I've been using skills across Claude Code, Codex, and Copilot for a while now, and the most important thing I've learned is that the interesting problems aren't about writing the skill itself. They're about the routing, the scoping, and the verification. The actual `SKILL.md` is the easy part. Getting the system to pick the right skill at the right time and prove it did the job—that's the whole game.

## The mechanism

A **skill** is a folder—not a file—with a `SKILL.md` plus optional scripts, references, and assets. The design is shared across Claude Code, Codex, and the open [Agent Skills standard](https://agentskills.org): the model sees only a name and description at startup, loads full instructions when the task matches, and only _then_ loads supporting files or executes scripts if the instructions call for them.

That three-stage loading is **progressive disclosure**, and it's the architectural decision that makes skills useful. This isn't just a design preference—it's how Claude Code, Codex, and Copilot all avoid exhausting the context window. At startup, the model loads only a name and a one-line description per skill. Without that constraint, installing dozens or hundreds of skills would blow out the context window before the user even asks a question. With it, the model carries a lightweight catalog and pulls in detail on demand.

Here's what that looks like in practice. Say you ask your agent to review a migration PR:

The model scans every skill description in its catalog. It matches on `db-migration-review`—"Review PostgreSQL schema migrations and rollback safety. Use when creating, editing, or validating SQL migrations or rollback plans." Now it loads the full `SKILL.md`, which tells it to classify the change, check forward and rollback paths, and run `scripts/verify.sh`. The script executes against the actual migration files. The model produces a structured risk assessment with a pass/fail verdict and specific findings. If the script fails—missing dependency, bad migration order—the model now has to interpret that failure and decide whether to retry, escalate, or report. That failure-handling loop is where a lot of the real complexity lives.

If the skill's description had been vague—something like "review code"—the model might have matched a completely different skill, or none at all. The right procedure would never have loaded. This is why routing matters more than the instructions themselves: the best `SKILL.md` in the world is useless if the system never selects it.

## Always-on vs on-demand

This is the distinction most people get wrong first.

`AGENTS.md`, `CLAUDE.md`, and Copilot's custom instructions are for **always-on** context: stable, repo-wide rules like project layout, build commands, coding conventions, and what "done" means. Skills are for **on-demand** context: specialized workflows or domain knowledge that should appear only when relevant.

My `CLAUDE.md` used to be a sprawling mess of every preference I'd ever had. The moment I started pulling specialized workflows into skills and keeping the always-on file focused, everything improved—routing accuracy, output relevance, all of it. The agent stopped drowning in instructions that had nothing to do with the task at hand.

The other extension layers solve different problems. **MCP** is for external tools and live systems. **Hooks** are for deterministic enforcement—formatting on save, blocking dangerous writes. These aren't suggestions to the model; they're guarantees. **Subagents and worktrees** are for isolated or parallel work, so exploration noise doesn't pollute the main conversation.

None of these replace a well-written skill. They're complementary.

## Skills shape how capabilities are applied

Agents across Codex and Claude Code share the same baseline: read a repo, edit code, run shell commands, generate tests, lint, typecheck, review diffs. Skills don't add new primitives—they orchestrate existing ones into specific problem-solving workflows.

The modern agent surfaces add operational depth—Codex has cloud tasks, worktrees, and noninteractive `codex exec` for CI; Claude Code has `claude -p`, remote sessions, and Chrome integration for browser-native verification—but the skills layer sits on top of all of that. A skill tells the agent _which_ of its capabilities to use, in what order, and how to prove the result is correct.

Agents are bad at the same things humans are bad at, except faster: vague tasks, missing environment setup, unclear acceptance criteria, and giant stale instruction files. The advice from every vendor reduces to the same thing: give the agent a runnable repo and a way to prove it succeeded.

## How the main tools compare

**Codex** revolves around `AGENTS.md`, `.agents/skills`, MCP, sandbox settings, and explicit parallel subagents. It reads `AGENTS` before work, supports guidance layering by scope, and exposes slash commands like `/init`, `/plan`, `/review`, and `/fork`. You ask for parallel agents explicitly—it doesn't auto-spawn them.

**Claude Code** uses `CLAUDE.md` plus auto memory, `.claude/skills`, built-in subagents, hooks, MCP, and Chrome. Its skill system is the most elaborate: you can restrict invocation, restrict tools, inject live shell output with `!command`, and run skills in isolated subagents with `context: fork`. Whether that richness is a feature or a complexity tax depends on how disciplined you are. (I am not always disciplined.)

**GitHub Copilot** has the cleanest framing. VS Code recognizes project skills in `.github/skills`, `.claude/skills`, _and_ `.agents/skills`—which makes Copilot the clearest proof that the format is becoming cross-agent infrastructure rather than a single-vendor trick.

## When a task should become a skill

If you keep reusing the same prompt, correcting the same workflow, or asking for the same checklist, it should probably become a skill. Log triage, release notes, PR review, migration planning—all good candidates.

But don't turn a one-off half-baked idea into a skill immediately. Start with one representative task. Get it working. _Then_ extract it. Anthropic's guidance goes further: build evaluations first, baseline the model without the skill, then add only the minimal instructions needed to close real gaps. Start narrow, then expand—because otherwise you're just productizing your confusion.

## A taxonomy of skills

After cataloging a bunch of skills—mine and other people's—I've noticed they cluster into four categories. The best ones fit cleanly into one; the more confusing ones straddle several, which is usually a sign they should be split.

**Knowledge skills** override the model's defaults. These explain how to correctly use a library, API, or internal framework—things the model either doesn't know or consistently gets wrong. Reference code snippets, gotchas sections, and "here's how _we_ do it" guidance. Examples: your internal billing library's edge cases, your design system's component patterns, your CLI wrapper's subcommands. The model knows how to write code; these skills tell it how to write code _your way_.

**Execution skills** orchestrate tools and scripts into a repeatable workflow. Code scaffolding, migration generation, deployment pipelines, cherry-pick-and-PR flows. These are procedures, not knowledge—they tell the model what to _do_, in what order, with what inputs.

**Verification skills** prove correctness. They describe how to test or verify that code actually works, often paired with Playwright, tmux, or a custom test harness. These might be the highest-leverage skills you can build. Having one engineer spend a week making your verification skills excellent pays for itself immediately. Consider having the agent record a video of its output or enforce programmatic assertions at each step.

**Automation skills** handle recurring business processes—standup posts, ticket creation, weekly recaps, dependency audits, orphan resource cleanup. For these, storing previous results in log files helps the model stay consistent across runs. A standup skill that keeps a `standups.log` means the next time you run it, the model reads its own history and can tell what's changed.

This separation is what lets teams scale skill libraries without turning routing into a guessing game. But the categories also cut across another axis that matters just as much: **risk level**. Knowledge skills are generally low-risk—they inform decisions but don't touch production. Verification skills are similarly safe. But execution skills that deploy code or automation skills that post to Slack or create tickets are high-risk by nature. Risk level should drive invocation policy: a knowledge skill can auto-fire safely, but a deployment skill should require explicit invocation. This connects directly to how you configure permissions, which I'll get to.

Most real workflows combine skills from two or three of these categories. A migration review might load a knowledge skill for your database conventions, an execution skill for the review workflow, and a verification skill to run the checks. That composition is where things get interesting—and where things break.

## Writing skills that work

**The description is the routing key.** When a session starts, the model scans every skill's name and description to decide which one matches. A vague description like `backend-helper` triggers on everything and matches nothing. A precise one like `Review PostgreSQL schema migrations and rollback safety. Use when creating, editing, or validating SQL migrations or rollback plans.` tells the model exactly when to activate—and when not to.

**Keep each skill scoped to one job.** Here's what the difference looks like in full.

A bloated skill:

```markdown
---
name: code-stuff
description: Helps with code review, deployment, and documentation.
---

- Read code and suggest improvements
- Review PRs for style issues
- Deploy services to staging and production
- Generate API documentation
- Run database migrations
- Update changelogs
```

A focused skill:

```markdown
---
name: db-migration-review
description: >-
  Review PostgreSQL schema migrations and rollback safety.
  Use when creating, editing, or validating SQL migrations
  or rollback plans.
---

# Inputs

- Migration files or PR diff
- Target service and database version

# Workflow

Open changed migration files and related application code.
Classify: additive, destructive, backfill, index, constraint,
rename. Check forward path, rollback path, and operational risk.
Run `scripts/verify.sh`. Summarize risks, required fixes, and
approval status.

# Verification

- Run `scripts/verify.sh`
- Confirm tests pass
- Confirm rollback path exists or explicitly state why not

# Escalate when

- Data loss is possible
- Rollback is irreversible
- Runtime and migration ordering is unsafe
```

The first one tries to do six things and will do all of them poorly. The second one does one thing and proves it.

**Don't state the obvious.** The model already knows how to write code. Focus your skill on information that pushes it out of its normal way of thinking—the gotchas, the things it'll get wrong on the first try, the decisions specific to _your_ codebase.

**Build a gotchas section and keep adding to it.** Every time the model gets something wrong while using your skill, add it to the list. This is the part that compounds.

**Start instruction-only, then add scripts when they earn it.** A script earns its place when it replaces fragile model-generated code with reliable execution, saves tokens, or removes ambiguity. Not before.

**Turn prose into procedures.** The body reads like a workflow, not an essay. Decision points, verification steps, escalation paths. The more you encode, the less the model has to improvise.

## Multi-skill composition

Most real tasks involve two or three skills activating in sequence or combination. This is where the system gets interesting—and fragile.

The core problem is **routing competition**. Every skill's description competes in the same system prompt space. When you have `api-reviewer` and `code-quality-checker` and `pr-review-standards` all installed, a prompt like "review this PR" could plausibly match any of them. The model has to disambiguate, and it doesn't always get it right.

Naming consistency matters more than you'd think. If three skills all use "review" in their descriptions, the model is essentially guessing. The fix is to make descriptions mutually exclusive: one skill reviews _migrations_, another reviews _API contracts_, a third enforces _style standards_. Overlap in descriptions creates ambiguity in routing.

Ordering is another issue. When multiple skills _should_ activate for a single task, the model decides the sequence. You can influence this by making dependencies explicit in your skill's workflow section—"Before running this skill, check whether the `schema-conventions` skill applies to the changed files"—but you can't guarantee it.

And here's the part that makes evaluation genuinely hard: composition is not deterministic. Two runs of the same prompt can trigger different skill combinations depending on subtle phrasing differences, context window state, or even how many other skills are loaded. At scale, you're not designing a system—you're shaping probabilities. The orchestration complexity grows fast as you add more skills, which is why Anthropic's enterprise guidance recommends keeping your active skill count low and using role-based bundles when you need more. More skills is not always more capability.

## Evaluating skills

Saying "test 3–5 queries" is technically correct and practically insufficient. A real evaluation strategy needs three things.

**Before/after measurement.** A skill is successful if it increases success rate, reduces retries, reduces manual correction, or cuts time-to-completion compared to the baseline. That last one matters more than you'd think: a skill that produces correct output but takes three times as long because it loaded too much context or ran unnecessary scripts is still a bad skill. Before you write the skill, run the model on the same task without it and record what happens. After you deploy the skill, run the same tasks and compare. If the delta is negligible, the skill isn't earning its context cost.

**Trigger testing.** Separately from output quality, test whether the skill fires when it should, stays quiet when it shouldn't, and handles ambiguous prompts gracefully. A skill that produces beautiful output but triggers on the wrong requests—or fails to trigger on the right ones—is broken in a way that output quality metrics will never catch.

**Observability.** Log skill invocations. Track which skills activate, how often, and whether the user overrides or corrects the result. You can do this with a `PreToolUse` hook that logs skill usage. A spike in user corrections is often the first sign a skill is misfiring. Over time, the data tells you which skills are pulling their weight and which are undertriggering—or overtriggering—compared to expectations.

## Why skills fail in production

The anti-pattern lists that circulate online are accurate as far as they go, but they describe symptoms rather than causes. There are four root causes behind most skill failures.

**Routing ambiguity.** The wrong skill gets selected because descriptions overlap, are too vague, or compete with other skills for the same trigger phrases. The model picks one, and it's the wrong one. You don't notice immediately because the output looks plausible—it's just answering the wrong question. This is the most common failure mode and the hardest to detect without trigger testing.

**Context overload.** Too many skills are active, or the skill itself is too long, or the always-on layer is bloated. The model's outputs degrade not because the skill is bad, but because it's competing for attention with too much other material. This one is insidious because it looks like the model is "getting dumber" when actually you're just drowning it.

**Hidden dependencies.** The skill assumes packages are installed, services are running, credentials are configured, or another skill is present—and none of that is declared or checked. The script fails at runtime with an error message the model doesn't know how to interpret. Self-contained scripts with explicit dependencies and helpful errors aren't pedantry; they're the difference between a skill that works on your machine and one that works on everyone's.

**Missing verification.** The skill tells the model what to do but not how to prove it worked. The model finishes, says "done," and the user discovers the problem hours later. A skill without verification is a skill that _occasionally_ works and _silently_ fails.

## The contrarian take

Skills are mostly discipline encoded as infrastructure. You can approximate everything a skill does with well-structured prompts, careful context management, and a good `CLAUDE.md`. I've done it. You probably have too.

The difference between a well-structured prompt and a skill is the difference between remembering to follow your checklist every time and having the checklist built into the system. One depends on your discipline in the moment; the other doesn't. Skills don't give you new capability—they give you _consistency_, which turns out to be the harder problem.

That said, if you only have two or three workflows worth formalizing, you might be better off keeping them in your always-on config and skipping the skill abstraction entirely. Skills earn their overhead when you have enough specialized workflows that putting them all in `CLAUDE.md` would bloat it past the point of usefulness. If your always-on file is under 200 lines and covers everything you need, you probably don't need skills yet.

## Advanced patterns

Claude Code's `!command` substitution lets a skill inject live shell output into the prompt before the model sees it—useful for diagnostics, but dangerous if the command produces huge output. `context: fork` runs the skill in an isolated subagent, which is excellent for PR summarization and research-heavy workflows.

Codex leans more toward environment and orchestration: `agents/openai.yaml` sets invocation policy and tool dependencies, cloud environments pin tool versions, and worktrees let you schedule recurring skill-backed tasks in the background.

Some skills can store data across runs—append-only logs, JSON files, even a SQLite database. Store this in a stable folder (Claude Code provides `${CLAUDE_PLUGIN_DATA}` for this), not in the skill directory itself, or upgrades will wipe it.

One thing worth saying plainly: skills are a real attack surface. A malicious skill can execute with the same permissions as your agent—hidden instructions, embedded prompt injection, or scripts that run with full shell access. This isn't theoretical; it's a documented risk with any system that loads untrusted instructions into a model's context. Treat third-party skills the way you'd treat third-party code: read them before you install them, and don't give them more access than they need.

Portability is real, but not absolute. The shared skill format works across vendors, and VS Code explicitly treats skills as open-standard artifacts. But client-specific metadata and deployment differ. Portable core instructions are easy; portable distribution and control planes are where the boring work begins.

## A practical template

```
my-skill/
├── SKILL.md
├── references/
│   └── checks.md
└── scripts/
    └── verify.sh
```

And the `SKILL.md` skeleton:

```markdown
---
name: db-migration-review
description: >-
  Review PostgreSQL schema migrations and rollback safety.
  Use when creating, editing, or validating SQL migrations
  or rollback plans.
---

# When to use

Schema changes, rollback planning, or migration reviews.

# Inputs

- Migration files or PR diff
- Target service
- Database version
- Relevant repo rules from AGENTS.md or CLAUDE.md

# Workflow

Open the changed migration files and related application code.
Classify the change: additive, destructive, backfill, index,
constraint, rename. Check forward path, rollback path, and
operational risk. Run the verification script. Summarize risks,
required fixes, and final approval status.

# Verification

- Run `scripts/verify.sh`
- Confirm tests pass
- Confirm rollback path exists or explicitly state why not

# Escalate when

- Data loss is possible
- Rollback is irreversible
- Runtime and migration ordering is unsafe
```

Keep the edge-case lore in `references/`. Put a script in `scripts/` only if it materially improves reliability.

## The real bottom line

If your agent is unreliable, the problem is almost never the model. It's your context strategy—what the model knows, when it knows it, and whether it has a way to prove it did the job. Skills are how you fix that. Not by giving the agent more power, but by giving it less noise and more structure.

Everything else is vendor paint.
