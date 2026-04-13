---
title: Making It Hard to Cheat the Guardrails
description: 'Git hooks are policy. Real guardrails are layered: command denial, protected configuration, CI mirrors, and merge rules that still hold when an agent gets creative.'
modified: 2026-04-12
date: 2026-04-12
---

If an agent can dodge the guardrail the first time it gets annoyed, that wasn't a guardrail. That was a suggestion with nice typography.

Local [Git](https://git-scm.com/) hooks are still worth having. I love a fast [`Lefthook`](https://github.com/evilmartians/lefthook) or [`Husky`](https://typicode.github.io/husky/) setup because it shortens the loop and keeps obvious mistakes on the laptop. But hooks are only one layer. Agents will absolutely discover `git commit --no-verify`, tool-specific skip environment variables, editable rules files, and "what if I just change the workflow?" if you leave those doors open.

So, the real question is not "how do I tell the agent not to cheat?" The real question is: _how many layers have to agree before bad code reaches main?_

## The common bypasses

Let's name the obvious ones, because unnamed failure modes keep showing up in postmortems.

- `git commit --no-verify`
- tool-specific skip switches like `HUSKY=0`, `LEFTHOOK=0`, or `LEFTHOOK_EXCLUDE=...`
- editing `lefthook.yml`, `.husky/*`, `package.json` scripts, or rules files to weaken the checks
- changing CI so the expensive or meaningful checks no longer run
- pushing directly to a branch that is allowed to bypass review or required checks
- force-pushing away inconvenient history after a bad local choice

None of these are theoretical. They are exactly what a fast-moving agent will find if it is optimizing for "command succeeded" instead of "change is trustworthy."

## Start with a blunt rule in the instructions

The first layer is still the simplest one: say the rule out loud in `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, or the equivalent policy file.

You want explicit language, not vibes:

```markdown
## Git and verification

- Never use `--no-verify`, `HUSKY=0`, `LEFTHOOK=0`, or other hook-skipping
  flags or environment variables.
- Never weaken hook, CI, or ruleset configuration to make a failing change
  pass. Fix the code or stop and explain the blocker.
- Changes to hook configuration, workflow files, or agent policy files
  require the same review standard as application code.
```

Will the instruction be enough on its own? No. But it does two important things:

- it makes the policy legible
- it gives the next enforcement layer something precise to enforce

## Deny the bad command before it runs

This is the cleanest technical control when your agent runtime supports it. If the tool can inspect shell commands _before_ execution, deny the bypasses there.

The pattern is broader than `--no-verify`. Treat skip flags and skip environment variables as the same class of escape hatch:

```js
import fs from 'node:fs';

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';

const bypassPattern = /(^|\s)(--no-verify|HUSKY=0|LEFTHOOK=0|LEFTHOOK=false|LEFTHOOK_EXCLUDE=)/;

if (!bypassPattern.test(command)) {
  process.exit(0);
}

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        'Do not bypass local verification. Fix the failing guardrail instead.',
    },
  }),
);

process.exit(0);
```

That script is the portable part. Wire it into whatever runtime you use:

- [Claude Code hooks](https://docs.claude.com/en/docs/claude-code/hooks) can deny a `Bash` command before it runs.
- [Codex hooks](https://developers.openai.com/codex/hooks) can do the same for `Bash` tool use.
- [Cursor CLI permissions](https://docs.cursor.com/cli/reference/permissions) are coarser, so you may need approval on all write-oriented `git` commands or a deny rule for `Shell(git)` if you want a truly hard boundary.

The previous [Git Hooks with Lefthook](git-hooks-with-lefthook.md) lesson walks through the tool-specific shape. The bigger idea here is that you should block the _class_ of bypass, not just one flag.

## Mirror the local checks in CI

This is the layer that matters most.

If the same lint, type, unit, end-to-end, accessibility, or dossier checks do not run in CI, then bypassing a local hook actually matters. If CI reruns the authoritative set, local bypass becomes an annoyance instead of a supply chain problem.

My default split looks like this:

- pre-commit: staged-file formatting, linting, secret scanning
- pre-push: slower local checks that still fit in under a couple minutes
- CI: the authoritative superset, running from a clean environment

That "clean environment" part matters. CI should not inherit your local caches, reused servers, or manually booted services. It should prove the branch from scratch.

## Protect the protection layer

If an agent can change the rules that evaluate it, you have a governance problem.

Put the protection files behind the same review pressure as production code:

- [`CODEOWNERS`](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) on `lefthook.yml`, `.husky/**`, `.github/workflows/**`, `.claude/**`, `.codex/**`, `.cursor/**`, and policy files
- required reviews for those paths
- alerts in review templates or pull request descriptions when infrastructure files changed

I also like making the CI check names stable and obvious. "typecheck", "unit", "end-to-end", "secret-scan" is harder to game than one opaque job named "verify."

## Make merge rules do the real enforcement

On [GitHub](https://github.com/), the enforcement boundary you can count on is not the local hook. It is [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) or, better, [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) plus required status checks.

The guardrail stack I trust looks like this:

- pull requests required for protected branches
- required status checks for the same gates the hooks mirror
- force-push restrictions on protected branches
- dismissal rules or review requirements that stop the "change the workflow, then merge it yourself" path

If you run your own Git server, server-side pre-receive hooks are even stronger. But most teams live on hosted Git platforms, which means rulesets and required checks are the boundary that actually counts.

## Treat hook skips as incidents, not features

Some tools document skip paths because humans occasionally need them. [`Husky`](https://typicode.github.io/husky/how-to.html) explicitly documents `HUSKY=0`. [`Lefthook`](https://lefthook.dev/usage/env.html) explicitly documents `LEFTHOOK=0` and `LEFTHOOK_EXCLUDE`. That documentation is not permission for agents to improvise around your standards. It is a reminder that local hooks are userland code and therefore bypassable.

That should push you toward two decisions:

- keep the hooks fast enough that people do not want to skip them
- assume a skip is possible and build the next layer anyway

Fast hooks reduce temptation. CI and merge rules reduce blast radius.

## Watch for the more subtle bypass

The sneakiest version is not `--no-verify`. The sneakiest version is weakening the rule itself:

- removing a job from the workflow
- changing a required check name
- narrowing a file glob so the hook stops seeing important files
- moving a command from pre-push to "we'll do it later"

That is why I like path protection on infrastructure files and why I call them out specifically in review. The problem is not only "agent skipped the hook." The problem is also "agent made the hook meaningless and then technically obeyed it."

## The agent rules

```markdown
## Guardrails

- Never bypass hooks with `--no-verify`, `HUSKY=0`, `LEFTHOOK=0`,
  `LEFTHOOK_EXCLUDE`, or similar escape hatches.
- Never modify hook, workflow, or policy configuration to make a failing
  change pass unless the task is explicitly about changing that
  configuration.
- Local hooks are convenience. CI and merge rules are authority. Keep the
  same critical checks in both places.
- Treat changes to infrastructure guardrails as high-risk edits that require
  explicit review.
```

## The thing to remember

You do not prevent guardrail bypass by being stern in a markdown file. You prevent it by layering policy, pre-execution denial, protected configuration, CI mirrors, and merge rules so that no single shortcut is enough. Local hooks keep the loop fast. The rest of the stack keeps the loop honest.

## Additional Reading

- [Git Hooks with Lefthook](git-hooks-with-lefthook.md)
- [Secret Scanning with Gitleaks](secret-scanning-with-gitleaks.md)
- [CI as the Loop of Last Resort](ci-as-the-loop-of-last-resort.md)
- [Post-Merge and Post-Deploy Validation](post-merge-and-post-deploy-validation.md)
