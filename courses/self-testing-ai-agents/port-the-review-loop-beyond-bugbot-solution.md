---
title: 'Port the Review Loop Beyond Bugbot: Solution'
description: Walkthrough of the review-loop playbook—blocking rules, noise categories, the rule of three, and what it takes to make the process survive a tool swap.
modified: 2026-04-14
date: 2026-04-10
---

The review loop is the only loop in Shelf that's purely about process. There's no test file to run, no config to validate, no CI job to trigger. The deliverable is a written policy that makes the second-opinion review portable across tools. That's harder than it sounds, because it means encoding decisions that most teams leave in someone's head.

## Expected experience walkthrough

### Writing the playbook

The `docs/review-loop-playbook.md` file you add in this lab breaks every possible review finding into three buckets. Here's how to think about each one.

**Blocking** findings are patterns where the cost of merging the bad code is higher than the cost of stopping the PR. In Shelf, these are specific and concrete:

- An API handler reads user identity from the request body instead of `locals.user`. This is a real security boundary—the request body is attacker-controlled, `locals.user` is server-validated.
- An admin route doesn't call `requireAdministrator`. Missing authorization on an admin route isn't a style nit.
- A Drizzle query on user-owned data doesn't scope by the current user. This means one user can see or modify another user's shelf entries.
- A `catch` block swallows an error and returns 2xx. The caller thinks everything is fine. It isn't.
- A Playwright spec uses `page.waitForTimeout`, a raw CSS `page.locator`, or logs in manually instead of using storage state (once the auth-bootstrap lab lands). These are banned by `CLAUDE.md` (and, after the static-layer lab, by ESLint rules too). If a reviewer catches them, the static layer has a hole.
- A change removes the dossier script, the JSON reporter, or the retained trace config (once added in the dossier and reporter labs). Those are the diagnostic lifeline for every future failure.

Notice how none of these say "the code looks messy" or "this could be refactored." Blocking findings are about _correctness_, not taste.

**Judgment** findings are the reviewer saying "this smells off but I could be wrong." Unclear naming, error messages that could be more specific, helpers that might deserve extraction. These are worth reading. They're often worth fixing. But the author can push back with reasoning, and that's fine. The playbook's job is to make sure judgment findings don't get treated as blocking _or_ as noise.

**Noise** findings are the stuff the reviewer should never have mentioned. In Shelf, this includes generated files under `playwright-report/`, snapshot PNGs, HAR fixtures, `sample-config.json`, and lockfiles. If a reviewer keeps flagging these, the problem isn't the reviewer's taste—it's the reviewer's instruction file. Update it.

### The rule of three

This is the escalation ramp. When the same kind of finding shows up on three different PRs:

- First two times: fix the PR and move on. It might be a coincidence.
- Third time: add a rule to `CLAUDE.md` encoding the pattern. Now every agent that reads the project instructions knows about it.
- Still recurring after the rule: add a lint rule, a test assertion, or a CI gate. The finding has graduated from advisory to automated.

The rule of three is the feedback mechanism that turns review findings into upstream prevention. Without it, the reviewer is just a very expensive `grep` that runs on every PR forever.

### Choosing an alternate review surface

The lab asks you to pick one surface besides Bugbot. The three natural choices for Shelf:

- **GitHub Copilot review:** add `.github/copilot-instructions.md` with the same blocking rules from the playbook. Copilot reads this file automatically on review requests.
- **Codex review:** add a repository prompt file that a Codex reviewer reads before reviewing the diff. Same rules, different format.
- **Claude Code with the `quick-review` skill:** the agent already reads `CLAUDE.md`, which contains the blocking patterns. The instruction surface is the project instructions file itself.

You don't need all three. You need _one_ that works. The test is: if Bugbot disappeared tomorrow, could the alternate reviewer pick up the same job without someone explaining the rules in a Slack thread?

### The instruction surface

Whatever tool you pick, it needs an instruction file in the repository. Not in a SaaS dashboard. Not in a team wiki. In the repo, checked in, versioned, reviewable. The whole point of this lab is that the review policy survives a tool change. If the policy lives in Bugbot's settings page, it doesn't survive anything.

One perfectly good minimal surface is a tiny reviewer prompt checked into the repo:

```markdown
# Secondary reviewer instructions

- Treat auth, user scoping, and banned Playwright patterns as blocking.
- Ignore generated artifacts, lockfiles, snapshot PNGs, and HAR fixtures.
- If you see the same issue category for the third pull request in a row,
  tell the author to promote it into `CLAUDE.md`, lint, or tests.
```

The instruction file should tell the reviewer the same things the playbook tells a human:

- What correctness means in this codebase (auth patterns, data scoping, error handling).
- What patterns are explicitly forbidden (the ESLint bans, the `CLAUDE.md` rules).
- What categories of finding matter most (blocking over judgment, judgment over noise).
- What to ignore entirely (generated files, fixtures, lockfiles).

### The re-review path

After a fix lands, the reviewer needs to rerun. The playbook documents this explicitly: push a new commit, the reviewer reruns automatically on the next push. On the second pass, the reviewer applies the same blocking rules. If it stays silent on a remaining blocking pattern, the instruction file has a gap—fix the instructions, not the test.

This seems obvious until you're under pressure and the reviewer just approved a PR that still has an unscoped Drizzle query. If the re-review path isn't explicit, "just push again" turns into "I'll fix it in the next PR," which turns into "oh, that's been in production for three months."

## Judgment criteria

The playbook is working when:

- A new team member can read `docs/review-loop-playbook.md` and know exactly which findings are stop-the-line serious.
- The alternate reviewer can pick up a PR without any verbal context and produce findings in the right categories.
- The rule of three has actually fired at least once—meaning a repeated finding has graduated from review comment to `CLAUDE.md` rule or lint rule.
- Noise findings are rare, because the instruction surface tells the reviewer what to skip.
- The re-review path after a fix is boring and predictable: push, rerun, done.

If any of those aren't true, the playbook needs tightening. The most common failure mode is blocking rules that are too vague—"security issues" instead of "reads user identity from the request body." Specificity is what makes the rules automatable.

## Additional Reading

- [Lab: Port the Review Loop Beyond Bugbot](lab-port-the-review-loop-beyond-bugbot.md)
- [Review Portability Beyond Bugbot](review-portability-beyond-bugbot.md)
- [Tuning Bugbot for Your Codebase](tuning-bugbot-for-your-codebase.md)
