---
title: Tuning Bugbot for Your Codebase
description: How to configure Cursor Bugbot so it finds the real issues and shuts up about the rest.
modified: 2026-04-12
date: 2026-04-06
---

A review bot that comments on every PR with low-quality findings is a review bot that gets muted. The second-most-common failure mode (after "finds nothing useful") is "finds something on every PR regardless of whether there's something to find." Both failures kill the loop, because the signal stops being worth reading.

Bugbot—[Cursor's](https://docs.cursor.com/en/bugbot) review bot—lets you dodge both failures with a few specific settings. This lesson is the short version of what I'd hand a teammate on their first day using it.

## Turning it on

Bugbot runs as a GitHub integration. Install it from the Cursor dashboard, connect your repo, and it starts reviewing PRs automatically on open and on push. The default review posture is "comment on the diff where something looks wrong"—no summary, no rating, no blocking, just inline comments.

This is the posture I want. A summary review is a ritual. An inline comment is an action item.

## The repo-level config file

Drop a `.cursor/BUGBOT.md` at the root of the repo. This is Bugbot's instructions file—the same idea as `CLAUDE.md`, but for the reviewer. The file tells the bot what the codebase cares about and what to leave alone.

> [!NOTE]
> As of April 9, 2026, Cursor's docs use `.cursor/BUGBOT.md`. Older screenshots and repos may still show `.cursor/bugbot.md`. Follow the current Cursor docs for the account you're actually using, but keep the filename consistent everywhere in the repository and in your lesson notes.

Shelf commits the tuned `.cursor/BUGBOT.md` to the repository even before the hosted Bugbot review is wired up. The file is the authoring concern; pointing Bugbot at an actual GitHub PR is a deployment concern you handle separately.

```markdown
# Bugbot review rules for Shelf

## Context

Shelf is a reading-tracker built on [SvelteKit](https://kit.svelte.dev/) + TypeScript + [Drizzle](https://orm.drizzle.team/) + SQLite.
Tests run on [Vitest](https://vitest.dev/) (unit) and [Playwright](https://playwright.dev/) (end-to-end). [Better Auth](https://www.better-auth.com/) handles
authentication; authorization helpers live in `src/lib/server/authorization.ts`.

## What to flag

- API handlers under `src/routes/api/` that read user identity from the
  request body instead of the viewer. User identity comes from `locals.user`,
  never the request body.
- Admin-only route handlers that use plain `locals.user` checks or call
  something other than `requireAdministrator(locals.user)` from
  `$lib/server/authorization`. Any handler under `src/routes/api/admin/**` is
  admin-only.
- Drizzle queries that don't scope by the current user when operating on
  user-owned resources (shelf entries, ratings).
- Error handling that catches an error and returns 200. If we catch, we log
  and return an appropriate non-2xx status.
- Components that render user-generated content without escaping or
  sanitization.
- Playwright tests that use `page.waitForTimeout`, `page.locator` with raw
  CSS, or UI login. These patterns are banned in `CLAUDE.md`.
- Changes to the dossier loop that remove `playwright-report/report.json`,
  retained traces, or the `npm run dossier` script.

## What to leave alone

- Generated Playwright artifacts under `playwright-report/`.
- Storage-state files under `playwright/.authentication/`.
- Snapshot PNGs in `tests/end-to-end/*-snapshots/`.
- HAR fixtures under `tests/fixtures/*.har`.
- Generated `build/` outputs.
- Lockfiles.
- `src/lib/server/db/auth.schema.ts` — regenerated from [Better Auth](https://www.better-auth.com/), not
  hand-edited.

## Tone

Be direct. Name the line. Suggest a specific fix. Do not write
"consider," do not write "you may want to," do not summarize the PR.
If nothing is worth flagging, say nothing.
```

That file is going to carry most of the weight. The "what to leave alone" section is the one that prevents the bot from commenting on seed data and fixture files that are _supposed_ to be sketchy. The "tone" section is where you kill the reflexive niceties that make review bot comments feel like noise.

In Shelf, the local backstop for the planted-bug lab is still boring on purpose: `npm run typecheck`, `npm run lint`, and `npm run test` all stay green even when the permission bug is present. That is why the planted diff matters. The review loop is catching the class of bug the tests missed, whether the bad check was written as a hand-rolled `session.isAdmin` branch or as a "close enough" replacement for `requireAdministrator(locals.user)`.

## What the tone section buys you

I am serious about the tone rules. A review comment that starts with "consider refactoring this to..." is about 50% less likely to result in a fix than the same comment phrased as "this trusts the request body; use `locals.session.userId` instead." The direct version has a clear action. The hedged version has a conversation.

Your review bot is writing prompts for a follow-up agent (or a human developer). The more declarative the prompt, the more likely the next step is action instead of discussion. "Consider" is discussion. "Use X instead" is action.

Ask Bugbot—via its config file—to write like a senior engineer in a hurry. Then watch the follow-up fix rate go up.

## Scoping: don't review everything

Bugbot can be pointed at specific paths or told to ignore others. Use this aggressively.

Things I always exclude from review:

- Documentation (`docs/`, `*.md`). Docs get their own review workflow; a code review bot commenting on grammar is not helpful.
- Auto-generated files (types, OpenAPI clients, GraphQL codegen output). The bot has nothing useful to say about generated code.
- Migrations (`drizzle/migrations/` or similar). Migrations are reviewed once and never again; Bugbot commenting on them retroactively is just noise.
- Fixtures and seed data. Deliberately bad data lives here and every comment is a false positive.
- Lockfiles (`bun.lockb`, `package-lock.json`). Obvious.

Things I always include:

- Route handlers (`src/routes/**/+server.ts` and `+page.server.ts`). These are where security and correctness live.
- Database helpers (`src/lib/server/*.ts`). Query bugs live here.
- Shared components (`src/lib/components/*.svelte`). Render-level bugs live here.
- Test helpers (`tests/end-to-end/helpers/*.ts`). These amplify mistakes across the suite; bugs here cost a lot.

The bot's default is "review everything." Override it.

## What to do with a finding

When Bugbot leaves a comment, the workflow is straightforward:

1. **Read the finding.** Not every finding is correct. Plenty are nitpicks or misunderstandings.
2. **If it's right**, hand it to the agent. "Bugbot flagged this handler for trusting the request body. Fix it." The agent reads the comment, makes the change, pushes. Bugbot re-reviews on push.
3. **If it's wrong**, say so on the PR and mark the thread resolved. Treat any bot-side "learning" as a nice-to-have, not a guarantee. The durable fix is updating `.cursor/BUGBOT.md` so the false positive is less likely to recur.
4. **If it's neither clearly right nor clearly wrong**, err on the side of fixing it. Review bot findings tend to be symptoms, and even when the diagnosis is off, addressing the symptom usually improves the code. (True of human reviewers too, incidentally.)

## The escalation ladder (from the previous lesson)

Remember the rule of three from the last lesson. When Bugbot flags the same kind of thing repeatedly:

- Once or twice: fix the PR. Move on.
- Three times: add a rule to `CLAUDE.md` so the writing agent catches it upstream.
- Still happening after the rule: add a lint rule or a test assertion to make the bad pattern a hard fail.

The review bot isn't the end of the loop—it's the observer that tells you what to automate next. Every consistent Bugbot finding is a piece of information about where your upstream prevention is weak.

## What Bugbot isn't for

A quick honesty check.

- Bugbot is not a replacement for your tests. If you're relying on it to catch logic bugs, you're going to be disappointed about 60% of the time.
- Bugbot is not a performance audit. It doesn't run your code. It can't tell you that a hot loop is slow.
- Bugbot is not a style guide enforcer. Use ESLint and Prettier for that. They're cheaper, faster, and deterministic. The bot should not be commenting on formatting.
- Bugbot is not a human reviewer. It's a cheap, fast second pass. A real human reviewer—your teammate—is still going to see things Bugbot doesn't, and you should still be having real code reviews when it matters.

Treat the bot as the layer between "I finished writing the code" and "a human is going to look at this." It catches the low-hanging fruit so the human review can focus on the interesting stuff.

## CLAUDE.md rules

```markdown
## Review bot findings

- When Cursor Bugbot leaves a comment, read the finding and either (a)
  fix it and push a new commit, or (b) reply on the thread explaining
  why the finding is wrong, and mark the thread resolved.
- If Bugbot flags the same issue three times across three different
  PRs, add a rule to this file that prevents the pattern upstream.
- Do not argue with Bugbot in comments. If the finding is wrong,
  resolve the thread and update `.cursor/BUGBOT.md` to prevent
  the false positive.
```

## The one thing to remember

A tuned review bot is a collaborator. An untuned review bot is noise. The tuning lives in one file with two sections—"what to flag" and "what to leave alone"—plus a tone directive. Thirty minutes of tuning saves you weeks of muted notifications.

## Additional Reading

- [The Second Opinion](the-second-opinion.md)
- [Lab: Bugbot on a Planted Bug](lab-bugbot-on-a-planted-bug.md)
