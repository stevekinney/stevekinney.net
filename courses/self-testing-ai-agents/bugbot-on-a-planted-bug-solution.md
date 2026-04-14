---
title: 'Bugbot on a Planted Bug: Solution'
description: Walkthrough of the BUGBOT.md config and planted-bug branch you add for the lab—what is local, what requires a GitHub fork, and what the full loop looks like.
modified: 2026-04-14
date: 2026-04-10
---

This is a hybrid lab. Part of it is local authoring in the repo, and the rest—Bugbot installation, PR creation, the actual review comment—requires a GitHub fork and a Cursor account. I will walk both halves and be explicit about where the boundary is.

## What to add

### The config file

Open `.cursor/BUGBOT.md`. It has three sections.

**Context** names the stack in one sentence: SvelteKit + TypeScript + Drizzle + SQLite. It names the test runners (Vitest, Playwright) and points at the authorization helpers in `src/lib/server/authorization.ts`. This is the same kind of grounding we did in `CLAUDE.md`—tell the reviewer what it is looking at so it does not have to guess.

**What to flag** lists seven categories, each naming a specific pattern and a specific location:

- API handlers that read identity from the request body instead of `locals.user`.
- Admin routes that use a plain `locals.user` check instead of `requireAdministrator(locals.user)`.
- Drizzle queries that do not scope by the current user on user-owned resources.
- Error handling that catches and returns 200.
- Unsafe rendering of user-generated content.
- Banned Playwright patterns (`waitForTimeout`, raw `page.locator`, UI login).
- Changes to the dossier loop that remove critical artifacts.

Every item names the thing to look for _and_ where to look for it. "Admin routes under `src/routes/api/admin/**`" is a grep. "Unscoped queries" is a judgment call, but the scope is narrowed to user-owned resources. The Playwright patterns mirror the ESLint rules we wired in the static layer—belt and suspenders again.

**What to leave alone** lists the generated artifacts, lockfiles, storage state, snapshots, HARs, and build output. Without this section, Bugbot will comment on diffs in files you never edit by hand. That is noise, and noise trains you to ignore the bot.

**Tone** is three sentences. "Be direct. Name the line. Suggest a specific fix." No "consider," no summaries. This is the same voice principle from `CLAUDE.md`: if you would not say it to a colleague standing at your desk, do not let the bot say it in a review comment.

### The planted bug

The `planted-bug/admin-feature` branch changes exactly one file: `src/routes/api/admin/featured-books/+server.ts`. Here is the diff:

```diff
-import { requireAdministrator } from '$lib/server/authorization';
 import type { RequestHandler } from './$types';

 /**
  * Admin surface for featuring books on the public home page. Only Shelf
- * administrators may call this endpoint — `requireAdministrator` throws a 403
- * when the signed-in reader does not have administrator access.
+ * administrators may call this endpoint.
  */

 export const POST: RequestHandler = async ({ locals, request }) => {
-	requireAdministrator(locals.user);
+	if (!locals.user) {
+		error(401, 'Authentication required');
+	}
```

The import of `requireAdministrator` is gone. The call is replaced with a plain authentication check: `if (!locals.user)`. The endpoint now lets _any_ signed-in user feature or unfeature books. The JSDoc comment is quietly trimmed to remove the mention of administrator-only access.

This is not a subtle bug. It is a permission downgrade on an admin endpoint, and it is exactly the second item in BUGBOT.md's "what to flag" list. The branch passes `npm run typecheck`, `npm run lint`, and `npm run test` cleanly—because no test covers the case of a non-admin user hitting this endpoint. The happy path still works. That is the point: this is a bug that static analysis and existing tests _miss_, but a tuned reviewer _should_ catch.

The branch also removes the `/playground` route (it was added to main after the planted-bug branch was created). That diff is cosmetic—it is not the planted bug, and Bugbot should not comment on it.

## What you still need to run

Everything below requires a GitHub fork and a Cursor account. If you are working locally without a remote, document the gap and skip to "Patterns to take away." The local artifacts—the config file and the branch—are the part you can verify now.

### Fork and install

Fork the Shelf repo to your own GitHub account. Install Bugbot from the Cursor dashboard and grant it access to your fork. Confirm it is active by checking the Cursor dashboard or opening any existing PR—Bugbot should show up as a reviewer within a minute or two.

### Push and open the PR

Push both `main` (with `.cursor/BUGBOT.md` committed) and the `planted-bug/admin-feature` branch to your fork. Open a PR from `planted-bug/admin-feature` into `main`.

### Observe

Within a minute or two, Bugbot should post at least one inline comment on the diff. With the config file in place, the comment should land on the line where `requireAdministrator` was removed and explain that any signed-in user can now call the admin endpoint. If it does not find the bug on the first pass, update `.cursor/BUGBOT.md` and push again. That iteration _is_ the tuning loop—it is not a failure, it is the exercise.

### Hand it to the agent

Once Bugbot flags the bug, do not fix it yourself. Open Claude Code and say something like:

> Read the Bugbot comments on PR #1. Fix each finding. Push a new commit.

The agent should read the comment via `gh pr view --comments`, identify the affected file and line, restore the `requireAdministrator` import and call, and push. Bugbot re-reviews on the new push. Either the thread resolves or a refined follow-up appears.

The key constraint: zero messages where _you_ explain the bug. The bot found it, the agent fixed it, and you watched.

## Shipped vs. gap

**Local (shipped in the starter):**

- `.cursor/BUGBOT.md` exists with the three sections described above.
- The `planted-bug/admin-feature` branch exists with exactly the permission downgrade diff.
- The branch passes all local quality gates.

**Hosted (requires your GitHub fork and Cursor account):**

- Bugbot installation and activation.
- PR creation and the actual review comment.
- The agent-reads-comment-and-fixes loop.
- Bugbot re-review on the fixed push.

If you cannot complete the hosted half during the workshop, that is fine—the config file and the branch are the artifacts that matter for understanding. The hosted loop is the _proof_ that the config works, not the config itself.

## Patterns to take away

- **Tuning a reviewer is the same skill as writing `CLAUDE.md`.** Name specific patterns, name specific locations, name what to ignore. The structure is identical—only the audience changes from "agent writing code" to "agent reviewing code."
- **Plant the bug you want caught.** The fastest way to test a review config is to give it a known answer. If the reviewer misses a planted bug, the config has a gap. If it catches it, you have evidence the config works—not just faith.
- **The bot-to-agent handoff is the real test.** Bugbot finding the bug is half the loop. The agent acting on the finding _without you translating_ is the other half. If you had to explain the bug, the comment was not actionable enough—tune the tone section.
- **"What to leave alone" prevents noise fatigue.** A reviewer that comments on lockfiles and generated schemas trains you to ignore it. The exclusion list is as important as the inclusion list.

## Additional Reading

- [Lab: Bugbot on a Planted Bug](lab-bugbot-on-a-planted-bug.md)
- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
