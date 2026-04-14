---
title: 'Lab: Rewrite the Bad CLAUDE.md'
description: Tighten Shelf's starter instructions file until every rule is mechanically actionable and the UI stays product-facing.
modified: 2026-04-14
date: 2026-04-06
---

Time to do the thing.

Open the Shelf starter repository. At the root, there's a [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) file. In the local course baseline, it is no longer terrible—but it is still just a draft. Your job in this lab is to tighten it until every rule is something the agent can mechanically act on.

## Setup

Use an existing Shelf clone with dependencies already installed and the app available in your usual local workflow. Open [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) and `package.json` side by side in your editor. The Shelf starter ships with route, auth, and testing rules already—this lab is about making those rules _mechanically enforceable_ and short enough that an agent will actually follow them without you repeating yourself. Keep the ones that earn their place and tighten the ones that are still too vague.

## The task

Rewrite [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) so that every rule in it is something the agent can mechanically act on. You are allowed to delete _aggressively_. You are encouraged to delete more than you keep.

Specifically, the new file should include:

- A "what green means" section that names the exact commands the agent should run before declaring a task done. Look in `package.json` for the actual script names. Don't make commands up.
- At least one rule about how tests get written (TDD ordering, file location, naming convention—your call).
- At least one rule about how [Playwright](https://playwright.dev/) locators get chosen.
- At least one rule about user-facing copy staying in the voice of the product. Course notes, test rationale, route names, and infrastructure details belong in docs or comments, not in the UI.
- At least one rule about something the agent should _not_ do in this codebase (a directory to leave alone, a pattern to avoid, a dependency not to add).

Keep the file under sixty lines. If it's longer than that, you're probably writing instructions to yourself instead of to the agent.

The starter already ships with real paths worth naming. Use that. A rule that says "reuse `src/lib/components`" or "put Playwright specs in `tests/`" is stronger than a vague rule about staying organized.

## Acceptance criteria

Each item is independently checkable. Don't move on until all are ticked.

- [ ] [`CLAUDE.md`](https://docs.claude.com/en/docs/claude-code/memory) exists at the repository root and is under sixty lines (`wc -l CLAUDE.md` reports a number ≤ 60).
- [ ] The file contains a section that names at least three exact shell commands the agent should run before declaring a task done.
- [ ] Every command named in that section actually exists in `package.json` (verify with `cat package.json | grep <command-name>` for each).
- [ ] The file contains zero instances of the words "clean," "best practices," "good," or "appropriate" (`grep -iE 'clean|best practices|good|appropriate' CLAUDE.md` returns no matches).
- [ ] The file contains at least one rule that mentions a specific file path in the repo, and that path resolves (`ls <path>` exits zero for the path you named).
- [ ] The file contains at least one rule about [Playwright](https://playwright.dev/) locator choice that names a specific [Playwright](https://playwright.dev/) API (e.g., `getByRole`, `getByLabel`, `data-testid`).
- [ ] The file contains at least one rule that explicitly keeps user-facing copy about books and reading, and keeps course or testing notes out of the UI.
- [ ] You ran `npm run lint`, `npm run typecheck`, and `npm run test` after editing and all three exit zero. (`CLAUDE.md` is markdown, so they should be unaffected, but the habit is the point.)
- [ ] You committed the change with a message that starts with `lab(rewrite-the-bad-claude-md):` and the commit hash is on `HEAD`.

If `npm run test` flakes here because the starter is still using interactive sign-in inside the browser tests, note it and keep going. The very next lab exists to harden that exact failure mode.

### The one-shot probe

Copy and paste this block at the repository root to run every mechanical check above in one go. It exits zero when the file passes and prints the specific failing rule when it does not:

```sh
set -e

# Length cap
[ "$(wc -l < CLAUDE.md)" -le 60 ] || { echo "fail: CLAUDE.md has more than 60 lines"; exit 1; }

# Banned vague words
for word in clean "best practices" good appropriate; do
  if grep -iq "$word" CLAUDE.md; then
    echo "fail: CLAUDE.md contains banned word '$word'"
    exit 1
  fi
done

# Commands referenced in CLAUDE.md must exist in package.json
for cmd in $(grep -oE 'npm run [a-z:-]+' CLAUDE.md | awk '{print $3}' | sort -u); do
  grep -q "\"$cmd\":" package.json || { echo "fail: npm run $cmd not in package.json"; exit 1; }
done

# At least one Playwright locator API is named
grep -qE 'getByRole|getByLabel|getByText|data-testid' CLAUDE.md \
  || { echo "fail: no Playwright locator rule"; exit 1; }

echo "ok: CLAUDE.md passes every mechanical check"
```

Run that block inside the repo after each edit to CLAUDE.md. When it prints `ok`, the mechanical half of the lab is done and you can move on to the subjective half ("does the agent actually follow these rules when you give it a task").

## What this looks like against a real agent

Once your file passes the mechanical checks, the real question is whether it actually changes agent behavior. Here's what a run against Claude Code looks like with a tightened `CLAUDE.md` in place. The prompt:

> Add a "finished this year" count to the stats page. Follow the rules in CLAUDE.md.

A tightened `CLAUDE.md` produces a session that looks roughly like this:

```text
Reading CLAUDE.md...

I see the "Done means green" section. I'll need to run typecheck, lint,
knip, and test before I can report this complete.

Let me find the stats page. Grepping for "stats" in src/routes/...
  → src/routes/(app)/goals/+page.svelte exists. That looks like the
    closest thing to a stats page Shelf has today.

Reading +page.server.ts for the goals route to understand the data
shape... the loader already returns shelfEntries with finishedAt
timestamps. Good — I can compute the "finished this year" count from
that without adding a new query.

Editing +page.svelte to add a $derived expression:
  let finishedThisYear = $derived(
    shelfEntries.filter(entry =>
      entry.finishedAt &&
      new Date(entry.finishedAt).getFullYear() === new Date().getFullYear()
    ).length
  );

And the rendering:
  <p>You've finished {finishedThisYear} books this year.</p>

CLAUDE.md says user-facing strings are about books, shelves, and reading.
This one is. Good.

Running npm run typecheck...
  → exit 0, 3 pre-existing warnings in playground, not mine.

Running npm run lint...
  → exit 0.

Running npm run knip...
  → exit 0.

Running npm run test...
  → 38 passed. The authenticated visual baseline for /shelf didn't
    change because I edited /goals, not /shelf.

All four gates green. Task complete.
```

Two things to notice about this transcript:

- The agent read `CLAUDE.md` first and extracted the "Done means green" rule before touching any code. It didn't need to be reminded.
- It checked the product-copy rule against its own output before moving on. The rule fired as a guardrail, not a post-hoc check.

A _loose_ `CLAUDE.md` — the one the starter ships — produces a very different session. The agent still writes the feature, but it either skips the gates entirely or runs them out of order, and "please run the gates" becomes something you have to say in the chat. The difference between the two versions is the difference between "instructions the agent consults" and "instructions the agent mechanically obeys." The second one is the one you want.

If you're skeptical, try it yourself: revert `CLAUDE.md` to its starter state (or comment out the "Done means green" section), give Claude Code the same prompt, and compare the transcripts. The feature code will look similar; the process around it will not.

## Stretch goals

If you finish early:

- Add a rule that references a file you haven't created yet, then create it. (Shelf has a `tests/fixtures/` directory that's underused—a fixtures convention rule is a good fit.)
- Run the same task against a second agent (Cursor, Codex, Copilot) using the same instruction file translated to that agent's filename. Note where the rules survive the port and where they don't.
- Take the worst rule you _kept_ and try to make it more mechanically checkable. The goal is not perfection; the goal is to feel the difference between a rule the agent can act on and a rule it can't.

## What you should be left with

A `CLAUDE.md` you would actually want the agent to read. Shorter than the one you started with. More opinionated. Every line earns its place by being something the agent does, not something the agent _is_.

We'll come back to this file in almost every lesson from here on. By the end of the day, it's going to have rules from [Playwright](https://playwright.dev/) locators and waiting (see [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md) and [The Waiting Story](the-waiting-story.md)), [lint and dead code detection](lint-and-types-as-guardrails.md), and [the canonical CI command](ci-as-the-loop-of-last-resort.md). The rewrite you do today is the spine that the rest of the day hangs on.

## Additional Reading

- [Solution](rewrite-the-bad-claude-md-solution.md)
- [Instructions That Wire the Agent In](instructions-that-wire-the-agent-in.md)
- [The Hypothesis](the-hypothesis.md)
