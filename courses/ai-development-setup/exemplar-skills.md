---
title: Exemplar Skills
description: 'Skills worth stealing, and why each belongs in a skill rather than a subagent. Adapt every one to your codebase instead of installing it as-is.'
---

There are a lot of popular plugins chock full of skills. (A _plugin_ is a bundle of skills, hooks, and other pieces you install in one step.) It's tempting to install a few and call the setup done.

My advice, which may be controversial: treat these as exemplars and tailor them to your codebase. A skill that explains TypeScript to an agent that already knows TypeScript isn't doing much. A skill that explains _how your repository_ does things is.

[Exemplar Subagents](exemplar-subagents.md) is a catalog of helpers that earn their keep by being separate from the main agent. This page is the opposite. Each job here looks like something you could hand off, and each one goes worse when you do.

The reason is usually one of three. A subagent starts from a brief, with its own context and permissions, and reports back when it's done. These jobs need something a brief can't carry: your answers, you watching, or the main session's view of everything in flight. So they're [skills](skills.md), procedures the main agent runs right in your conversation. [Skill or subagent?](subagents.md#skill-or-subagent) has the general version of this decision.

A fourth reason gets its own section at the end: some skills don't do a job at all. They change how the main agent does _its_ job, and a subagent can't do that, because it isn't the main agent.

Each entry covers what the skill does, how it works, and why it shouldn't be a subagent. Where a public version exists, I've linked it, mostly to Anthropic's [official skills repository](https://github.com/anthropics/skills) and Jesse Vincent's [Superpowers](https://github.com/obra/superpowers). Read those before writing your own. They're better documentation of what a good skill looks like than anything I can tell you.

## It needs your answers

### Interview to spec

**What it does:** Turns a vague feature request into a self-contained specification by interviewing you until the hard parts are answered.

**How it works:** Invoke it with the rough idea. It reads enough of the codebase to ask good questions, then asks them a few at a time, starting with the ones that would change the design: who this is for, what happens at the edges, what's explicitly out of scope, and how you'll know it works. Have it use the `AskUserQuestion` tool, which turns each question into options you pick from. When your answers stop changing the design, it writes `SPEC.md`, with acceptance criteria concrete enough to hand to the [referee](exemplar-subagents.md#referee). A [junior engineer](exemplar-subagents.md#junior-engineer) can then read the spec cold and list anything it would still have to guess. Then you implement in a fresh session, so the implementation reads the spec and not the interview. [Let the agent interview you](planning-and-task-contracts.md#let-the-agent-interview-you) covers how I run this by hand; the skill just means I stop retyping the instructions.

Superpowers' [brainstorming](https://github.com/obra/superpowers/tree/main/skills/brainstorming) skill is a public version worth reading. It asks one question at a time, presents the design in sections for you to approve, and has an explicit hard gate: no implementation until you've signed off.

**Why it's a skill:** The whole job is a conversation with you. A subagent can't stop halfway and ask you something (in [dynamic workflows](running-workflows.md), `AskUserQuestion` is removed from every subagent outright), so it would have to guess, and the guesses are exactly what the interview exists to get rid of.

### Skill builder

**What it does:** Helps you write a new skill, then proves the skill makes a difference.

**How it works:** Anthropic's [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) is the one to copy. It starts by interviewing you: what should this skill do, and when should it trigger? It drafts `SKILL.md`, then writes a handful of realistic test prompts. For each prompt it starts two subagents in the same turn, one with the skill and one without (or with the old version, if you're improving an existing skill). While those run, it drafts assertions for the results. Then it grades the runs, aggregates them into a benchmark, and opens a viewer so you can compare the outputs side by side. Your feedback drives the next revision. A separate script tunes the description so the skill triggers when it should. The [self-improvement junkie](exemplar-subagents.md#self-improvement-junkie) is usually what tells you that you need one: a lesson that's a whole procedure rather than a one-line rule belongs here.

**Why it's a skill:** Notice that it _uses_ subagents. The runs are isolated on purpose, so the with-skill and without-skill outputs don't contaminate each other. But the loop around them belongs to you. Whether the output got better is often a judgment call (skill-creator itself says subjective skills like writing style should be evaluated qualitatively), and the only judge whose taste matters is the person who's going to use the skill. So the orchestration stays in the main session, where you are.

## It needs you watching

### Project initializer

**What it does:** Builds the scaffolding every later session depends on, once, before any feature work starts.

**How it works:** Run it on a new project, or on an old one you're about to hand to agents. It writes a script that starts the app (Anthropic calls it `init.sh`) and a check that proves the app works end to end. It puts the exact build and test commands in `CLAUDE.md`, in order, with what passing looks like. It writes a machine-readable feature list where every item starts out failing, and a progress file that later sessions read first and update last. Then it commits all of it, so there's a baseline to roll back to, and stops without writing a single feature. Every later session starts by reading the progress file and the git log. This is the "initializer agent" from Anthropic's [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), and [Where State Lives](where-state-lives.md) covers where each of those files belongs.

**Why it's a skill:** It runs once, and you want to watch it. Every decision it makes (what counts as working, which features exist, what's out of scope) is yours to correct, and corrections are cheap while it runs and expensive after a dozen sessions have built on them. A fresh worker would make every one of those calls without you.

### Plan writer

**What it does:** Runs the research and planning halves of [research, plan, implement](patterns-for-deciding-what-to-build.md#research-plan-implement), and stops for your review after each one.

**How it works:** Invoke it with the task. It sends a few [scouts](exemplar-subagents.md#scout) out in parallel, writes `research.md`, and stops. Once you've corrected it, it writes `plan.md` in phases small enough to finish in one go, and stops again. Superpowers' [writing-plans](https://github.com/obra/superpowers/tree/main/skills/writing-plans) is a good model. It assumes whoever executes the plan knows nothing about your codebase, so every step spells out the file paths and how to verify it. Its companion, [executing-plans](https://github.com/obra/superpowers/tree/main/skills/executing-plans), picks up from there. [Research, Plan, Implement](planning-and-task-contracts.md#research-plan-implement) has the longer version.

**Why it's a skill:** The stops are the job. A small misunderstanding in the research turns into a large error in the code, and the cheapest place to catch it is a short document you read before anything else happens. A subagent would hand back a finished plan built on research you never got to correct.

### Browser check

**What it does:** Lets the agent check its own UI work in a real browser: start the app, click around, take screenshots, and read the console.

**How it works:** Anthropic's [webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) skill has the agent write short [Playwright](https://playwright.dev) scripts. Its loop is reconnaissance, then action: wait for the page to settle, take a screenshot or dump the DOM, find the right selectors, and only then act. A bundled `scripts/with_server.py` starts one or more dev servers (say, a backend and a frontend), runs the script, and shuts everything down afterward. The skill tells the agent to run its helper scripts with `--help` and treat them as black boxes rather than reading their source, which keeps their code out of the context window. To adapt it, record how to start _your_ application, load synthetic test data, authenticate a test user, and navigate to the relevant feature. I'd write any helper scripts with the repository's existing TypeScript and browser tooling, rather than add a separate toolchain just for testing.

**Why it's a skill:** The point is to close the loop on the main agent's own work. If a subagent checks the UI, the main agent gets back a summary saying it "looks fine," which is the least useful sentence in software. When the main agent looks for itself, it sees the broken layout and fixes it in the same session. And if you've got the browser open, you see it too.

## It needs the main session's view

### Ticket dossier

**What it does:** Takes a ticket and pulls together everything your organization already knows about it, from wherever that knowledge lives, before anyone starts the work.

**How it works:** Invoke it with a ticket. It pulls the names, features, files, and dates worth searching for out of the ticket, then sends one subagent per connected source, all in parallel. The usual suspects are your tracker (Linear or Jira: linked and duplicate tickets, the comment history), your chat (Slack: the threads where it came up), your meeting notes ([Granola](https://www.granola.ai), or whatever transcribes your meetings: what got decided out loud), and your git history (`git log`, `git blame`, and past pull requests that touched the same code: what was tried before). Your list will look different. Each searcher gets only its own source's connector, and returns facts with a link and a date for each one, not a summary. Chat messages and ticket comments are content you don't control, so ask for a fixed structure, the way a [bookworm](exemplar-subagents.md#bookworm) does. Back in the main session, the skill merges the results into `dossier.md`: what was decided, by whom, and when, and what's still open. It flags contradictions and leans toward the newer source, since a decision made in Slack in March may have been reversed in a meeting in May. Then it asks you about anything it can't settle. It's a good step before [interview to spec](#interview-to-spec), because every question the dossier answers is one the interview doesn't have to ask.

**Why it's a skill:** The searching is subagent work: lots of reading, most of it irrelevant, and you want none of it in your context. The assembly isn't. Which of two conflicting decisions still stands is often something only you know, and the dossier is for the session that's about to do the work. Hand the whole job to a subagent and you get a summary of summaries, with the contradictions smoothed over.

### Integrator

**What it does:** Merges the branches from parallel workers back together, one at a time, checking after each one.

**How it works:** Once your workers have finished in their own [worktrees](worktrees.md), invoke it with the list of branches. It orders them so dependencies land first, merges one, runs the full check suite, and moves on only if everything passes. When a merge conflicts or breaks a check, it stops and tells you which branch and which check. It doesn't guess its way through the conflict. Lockfiles (the files that pin exact dependency versions) and other shared generated files get regenerated once, by the integrator, after the merges. Generate in parallel. Integrate in series.

For a single branch, Superpowers' [finishing-a-development-branch](https://github.com/obra/superpowers/tree/main/skills/finishing-a-development-branch) is a good model. It runs the full test suite and refuses to go further if anything fails. It confirms which branch the work split from, since merging into the wrong base is expensive to undo. Then it gives you a short menu (merge locally, open a pull request, or keep the branch as-is) and cleans up the worktree afterward.

If an [orchestrator](exemplar-subagents.md#orchestrator) ran the swarm, it can't merge, so start the integrator in an ordinary session from the handoff the orchestrator wrote.

**Why it's a skill:** Integration is the one step that has to see everything. It needs the main session's authority to change the branch everyone else builds on, and it needs to know what each worker was _supposed_ to do. Hand it to a subagent, and you've given the riskiest step in the workflow to the agent with the least context.

### Commit and pull request author

**What it does:** Writes commit messages and pull request descriptions that explain _why_ the change was made, not just what changed.

**How it works:** Have it read the staged diff and split unrelated changes into separate commits. Each message follows your conventions for format and length and gets checked against them. For the pull request, it fills in your template: the problem, the approach, what was considered and rejected, how it was verified (with the actual commands and output), and what a reviewer should look at first. Put the template in the skill's `assets/` folder so the structure doesn't drift. [Make the history reviewable](verification-and-evidence.md#make-the-history-reviewable) covers why this matters.

**Why it's a skill:** The diff only tells you _what_ changed. The _why_ lives in the conversation: the bug you chased for an hour, the approach you tried and threw out, the constraint you mentioned in passing. A subagent handed the diff can only describe the diff, and you'll get a pull request description that says "Updated `auth.ts`." Only the main session can write the one that says why.

### Pull request shepherd

**What it does:** Takes an open pull request from "opened" to "ready to merge." It fixes failing CI, resolves conflicts with the base branch, works through the review comments, and keeps checking until nothing is left. Then it stops and hands the merge to you.

**How it works:** Invoke it on a pull request. Each pass checks three things: the CI status (`gh pr checks`), whether the branch still merges cleanly into its base, and any unresolved review threads. For a failing check, it reads the log, reproduces the failure locally if it can, and fixes the cause. It doesn't skip the test, loosen the assertion, or rerun a flaky job until it happens to pass, and it tells you when it thinks a failure is flaky or unrelated to this change. For a conflict, it updates the branch from the base and resolves the conflict where it knows what both sides meant. Where it doesn't, it stops and asks. For review comments, it follows [taking review feedback](#taking-review-feedback): it weighs each one, fixes the ones that are right, and replies with its reasoning to the ones that aren't. Then it pushes, waits for CI, and checks again. Run it under `/loop` or `/goal` ([Goals and Loops](goals-and-loops.md) covers both) with the condition spelled out (checks green, no conflicts, no unresolved threads) and a [limit on passes](patterns-for-running-unattended-work.md#circuit-breaker), because a flaky check or a reviewer who keeps adding comments can keep it going forever.

**Why it's a skill:** Every fix needs the _why_ behind the change, and that lives in the main session, same as for the commit author. A subagent handed a review comment knows what the reviewer asked for but not what you were trying to do, so it either complies with everything or guesses. And the merge stays with you: "ready to merge" is where it stops, because merging is the gate in [human-gated autonomy](patterns-for-running-unattended-work.md#human-gated-autonomy) you don't hand over.

### Session handoff

**What it does:** Writes down what the next session needs to know before this one ends, gets compacted, or gets cleared.

**How it works:** Run it before you `/clear`, when you're about to stop for the day, or when the context is getting heavy. It updates the progress file (or writes a handoff note) with what got done, what's verified and how, what's half-finished, what was tried and abandoned and why, and the very next step. It marks each claim with when it was last verified. The next session reads that file first. [Where State Lives](where-state-lives.md) covers where the note should go, and [Managing a Long Session](managing-a-long-session.md) covers when to use it.

**Why it's a skill:** Everything worth handing off lives in the main context and nowhere else. The dead ends especially don't show up in the diff or the commit history. A subagent would have to reconstruct the session from the artifacts it left behind, which is exactly the lossy summary you were trying to avoid.

## It changes how the main agent works

These don't produce a deliverable you could delegate. They're a discipline the main agent applies to its own work, loaded at the moment it's about to cut a corner. A subagent can follow a protocol, but it can't make the _main_ agent follow one.

The first four below, all from Superpowers, share a structure worth stealing: a one-line rule (they call it an "Iron Law"), a description that triggers _before_ the agent would normally act, and a list of the rationalizations the agent will reach for, each with a rebuttal. That last part is the clever bit: it's written for the exact moment the model is talking itself out of the process.

### Debugging protocol

**What it does:** Stops the agent from guessing at fixes.

**How it works:** Superpowers' [systematic-debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) triggers on any bug, test failure, or unexpected behavior, _before_ the agent proposes a fix. Its rule is "no fixes without root cause investigation first." The agent works through four phases in order: investigate the root cause (read the whole error, reproduce it reliably, check what changed recently; a [reenactor](exemplar-subagents.md#reenactor) can handle the reproducing), look for working code that does something similar, form and test one hypothesis at a time, and only then write a fix, starting with a failing test. If three fixes in a row have failed, it stops and questions the architecture instead of trying a fourth. My version escalates sooner: after two failed fixes, it asks the [advisor](exemplar-subagents.md#advisor) before trying a third. It also requires a reproducible scenario, a small set of competing explanations, and an experiment that distinguishes them, and the result includes the evidence behind the diagnosis, not just a patch.

**Why it's a skill:** Guessing is the main agent's default. When a test fails, it wants to change something and rerun the test, because that sometimes works. You can delegate an [investigation](exemplar-subagents.md#conspiracy-theorist), but you can't delegate the main agent's urge to skip one.

### Test-first loop

**What it does:** Makes the agent write a failing test before it writes the code that makes it pass.

**How it works:** Superpowers' [test-driven-development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) enforces red, green, refactor: write the test, watch it fail for the right reason, write the minimum code to pass, watch it pass, then clean up. Its rule is blunt. If the agent wrote code before the test, it deletes the code and starts over. It doesn't get to keep the code "as a reference," because it'll just write the test to match the code. Matt Pocock's [`tdd`](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) skill is another good model. Whichever you start from, a repository-specific version should teach the agent which boundaries to test through, which collaborators to keep real, and what good tests look like in _this_ project.

**Why it's a skill:** Testing after the fact is how you get tests that check what was built rather than what was asked for. The [test designer](exemplar-subagents.md#test-designer) attacks the same problem from the outside, with a fresh context. This attacks it from the inside, by changing the order the main agent works in.

### Verification gate

**What it does:** Stops the agent from saying "done" until it has fresh evidence.

**How it works:** Superpowers' [verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) triggers whenever the agent is about to claim something is complete, fixed, or passing, and makes it run the proving command fresh and read the output first. Words like "should," "probably," and "seems to" are red flags. My adaptation maps each claim to the evidence in [Match the evidence to the claim](verification-and-evidence.md#match-the-evidence-to-the-claim) and reports anything that couldn't be tested.

**Why it's a skill:** The claim comes from the main agent, so the check has to happen in the main agent. A reviewer after the fact can catch a false "done," but by then you've already read it and maybe moved on.

### Taking review feedback

**What it does:** Makes the agent evaluate review comments instead of accepting all of them.

**How it works:** Superpowers' [receiving-code-review](https://github.com/obra/superpowers/tree/main/skills/receiving-code-review) has the agent read all the feedback before acting on any of it, restate each item in its own words, and check whether it's technically right for _this_ codebase. Then it either acknowledges the item or pushes back with reasons. If any item is unclear, it asks about that item before implementing the rest, because the items might be related. It bans the performative stuff ("You're absolutely right!") outright.

**Why it's a skill:** Models are agreeable. Hand one a list of review comments, and it will cheerfully implement all of them, including the wrong ones. A subagent can't change that, because the main agent is the one reading the review. This matters more as more of your reviewers are agents, whose suggestions deserve as much skepticism as anyone else's. That goes double for an [antagonist](exemplar-subagents.md#antagonist), which is told to find problems and will always find some.

### House style

**What it does:** Makes the agent's prose sound like you (or your team, or your docs) instead of a language model.

**How it works:** I have one of these for my own writing. The `SKILL.md` body is just the core rules of the voice and a checklist to run before handing back a draft. The full style guide, a list of anti-patterns, and annotated before-and-after examples live in reference files that the agent reads only when it needs them. Anthropic's [brand-guidelines](https://github.com/anthropics/skills/tree/main/skills/brand-guidelines) skill does the same thing for visual identity. The trick is the description: it should trigger whenever the agent is about to write prose for other people, not only when you remember to ask for it.

**Why it's a skill:** Voice isn't a task you can hand off and get back. It has to shape every sentence as it gets written, in whatever session is doing the writing. You could have a subagent rewrite drafts afterward, but then you're paying for every draft twice, and the rewrite tends to sand the content down along with the style.

### Delegation brief

**What it does:** Makes the main agent write a real brief every time it hands work to a subagent, instead of a one-line request.

**How it works:** It triggers right before the main agent starts a subagent or a workflow. The agent has to write down the goal, what done looks like, what to leave out on purpose (the implementation, for a test designer; the transcript, for a referee), the exact shape of what should come back, and permission to come back with nothing. [Delegating well](subagents.md#delegating-well) has the full list. Superpowers' [dispatching-parallel-agents](https://github.com/obra/superpowers/tree/main/skills/dispatching-parallel-agents) covers the parallel case: one focused brief per independent problem, each with its own scope and expected output. Its [subagent-driven-development](https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development) goes further, sending a fresh subagent for each task in a plan and reviewing the work between tasks. If you run an [orchestrator](exemplar-subagents.md#orchestrator), preload this skill with the `skills:` field. Writing briefs is its whole job.

**Why it's a skill:** You can't delegate writing the brief, because the brief _is_ the delegation. Every agent in [Exemplar Subagents](exemplar-subagents.md) works because of something its brief includes or leaves out, and the agent writing the brief is the main one. Left to its defaults, it writes "investigate the auth bug" and then wonders why the answer is vague.

## More to adapt

These don't fit the main-session argument as neatly, but they're worth stealing all the same. If you haven't yet, [Skills](skills.md) explains the pieces.

- **`implement-project-feature`** (my own idea, not borrowed from a published skill): Instead of explaining Next.js or TypeScript generally, give the agent a small set of exemplary features from your _actual_ codebase. Teach it how to choose the relevant example, trace the implementation, and adapt the pattern without copying unrelated machinery.
- **A CI repair skill**: CI is continuous integration, the service that runs your checks on every push. Inspired by [OpenAI's `gh-fix-ci`](https://raw.githubusercontent.com/openai/skills/main/skills/.curated/gh-fix-ci/SKILL.md), which inspects GitHub Actions checks and logs, extracts the actionable failure, proposes a plan, and separates investigation from approved implementation. An adaptation would also compare the failing revision with a relevant baseline and distinguish an application regression from an infrastructure failure, missing configuration, or an existing flaky test. The [pull request shepherd](#pull-request-shepherd) can call it for each failing check.
- **Research an integration and finish with a decision**: This should be much more specific than "research this library." I'd have it determine the versions involved, consult primary documentation, identify constraints in the existing application, and build the smallest disposable experiment that resolves the most important uncertainty. The output contains a recommendation, supporting evidence, unresolved questions, and a minimal working example, or a concrete explanation of where the experiment failed.

### Playbooks

Inspired by [Vercel](https://github.com/vercel-labs/agent-skills/tree/main)'s [`composition-patterns`](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns) and [`react-best-practices`](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices), you can build a _playbook_: a skill made of rules and a style guide rather than a step-by-step procedure for one task. Codify your own and it pushes agents toward better decisions. Back it with lint rules or some other external check and it holds up even better: a rule the linter enforces doesn't depend on the agent remembering it.

### Inspiration

These ideas don't come from any one source. Each one changes the question the agent is answering. A few of them (a fresh session, an isolated copy, a disposable environment) can't happen inside your current conversation; run those as a forked skill or a subagent, or have the skill call a script. [Skill or subagent?](subagents.md#skill-or-subagent) covers the choice.

- **Explain why this weird code exists**: Before simplifying suspicious code, have the skill inspect when it was introduced, related changes, tests, comments, and available issue history.
- **Find counterexamples to the specification**: Rather than ask the agent to critique a specification abstractly, require concrete scenarios where two reasonable implementations would behave differently. The skill generates cases involving transferred ownership, membership removal, in-flight jobs, shared resources, and deletion requested twice. Then it separates questions existing policy already answers from decisions that need your input.
- **Prove these tests notice broken behavior**: After adding tests, deliberately introduce a few targeted defects in an isolated copy and check whether the tests detect them. The skill should justify each mutation, verify that it changes the relevant behavior, run the narrow test set, and restore the isolated copy. An equivalent mutation (a change that doesn't alter the code's behavior, so no test could catch it) or an unrelated compilation error shouldn't count as useful evidence.
- **Design the API from the caller's side first**: Require realistic usage examples before implementing the abstraction: a simple case, a composed case, an advanced case, invalid usage, and migration from the current API. The skill compares a few API shapes against the same examples, then evaluates inference, discoverability, diagnostics, runtime behavior, and implementation complexity.
- **Review what the diff forgot to change**: Instead of reviewing only edited lines, infer the feature's affected surfaces and inspect the ones that were left untouched. If a pull request adds API-key creation, the skill checks whether expiration, revocation, permission checks, audit events, SDK exposure, documentation, and tests are relevant and addressed. It should derive expectations from the requirements and comparable features, not declare every imaginable integration mandatory. It changes the review question from "Is this code reasonable?" to "Is this change complete?"
- **Generate fixtures designed to embarrass the interface**: Have the skill produce deterministic, reproducible test data that targets the assumptions of a particular interface. For a project picker, I'd request duplicate names with different identifiers, very long names, Unicode, archived entries, missing optional metadata, mixed permissions, no results, and enough entries to exercise pagination.
- **Rehearse failure and recovery**: Use this for asynchronous jobs, workflows, event processing, uploads, and external API calls. The skill identifies important interruption points, defines the expected recovery behavior, and creates controlled experiments in a disposable environment.
- **Find a smaller change that still satisfies the requirements**: After implementation, ask the skill to challenge the necessity of new abstractions, configuration, dependencies, and unrelated edits. The skill must preserve a fixed acceptance checklist and compare alternatives in an isolated branch or copy. Passing existing tests isn't enough when they don't cover a requirement.
- **Pretend the next maintainer didn't watch us build this**: Start from a clean checkout and a fresh session (a new conversation with no history), and use only committed documentation and supported setup procedures. Try to start the application, run relevant tests, locate configuration, exercise the feature, and diagnose one representative failure.
- **Extract a reusable procedure from what we just learned**: After a difficult task, inspect the actual session evidence: failed approaches, corrections, successful commands, missing context, and the final verification. That's how most of your own skills should start. Many of these ideas also work as [subagents](exemplar-subagents.md) when you want them run in a separate context.

## Writing your own

The best source of skills is your own chat history. When you paste the same playbook into a session for the third time, it should be a skill. [Skills](skills.md#what-makes-a-good-skill) covers what a good one contains. A few things these examples get right that are easy to miss:

- **The description is the trigger.** The agent only sees each skill's name and description until one activates, so all the "when to use this" belongs in the description, not the body. Anthropic's own guidance in skill-creator is that models tend to _undertrigger_ skills, so descriptions should be "a little bit pushy" and name the specific situations where the skill applies. The Superpowers descriptions all start with "Use when…" for this reason.
- **Keep the body short and push detail down.** Anthropic suggests keeping `SKILL.md` under about 500 lines. Past that, move material into reference files with clear pointers to when to read each one.
- **Make scripts black boxes.** When the agent runs a bundled script, only its output enters the context window. When it _reads_ the script, the whole thing does. Say which one you want, the way webapp-testing does.
- **Write down the rationalizations.** If the skill exists to stop a shortcut, list the excuses the agent will use to take the shortcut anyway, and answer each one.
- **A skill is advice.** It can be skipped, misread, or not triggered. If something has to happen every single time, it belongs further up [the enforcement ladder](the-enforcement-ladder.md), in a hook or a check. That's why the [test ratchet](patterns-for-proving-it-works.md#test-ratchet), the [mutation gate](patterns-for-proving-it-works.md#mutation-gate), and the [circuit breaker](patterns-for-running-unattended-work.md#circuit-breaker) don't get skills here. A ratchet the agent can talk itself out of isn't a ratchet.

A skill can also opt into running in an isolated context with `context: fork`, which blurs the line this page is drawing. [How `context: fork` works](skill-configuration.md#how-context-fork-works) covers when that's useful. For the jobs on this page, it usually isn't.

If a job needs you, needs to watch everything in flight, gets the final say, or has to change how the main agent behaves, keep it in the main session and write it down as a skill. Whatever you borrow, keep the structure and replace every generic example with one of yours.
