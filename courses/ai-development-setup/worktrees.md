---
title: Worktrees
description: 'A worktree gives each agent its own files and branch, but not its own ports, databases, secrets, or decisions. Where they break, and how to clean up safely.'
---

Run two agents in the same checkout and they'll step on each other's edits within minutes. The usual fix is a [Git worktree](https://git-scm.com/docs/git-worktree): an extra checkout of the same repository in its own directory, with its own files and branch. Nobody overwrites anybody.

That fix is narrower than it looks. Worktrees reduce file collisions. They do _not_ isolate services, ports, databases, secrets, or decisions. That gap is, by a wide margin, my largest source of agent friction: in two months, my worktree guard—a [hook](hooks.md) that blocks commands that would escape the agent's worktree—refused 465 of them.

## What's shared and what isn't

| Separate per worktree | Shared across all of them                                              |
| --------------------- | ---------------------------------------------------------------------- |
| The working files     | Commits, branches, and tags                                            |
| The index             | Stashes, Git configuration, and Git hooks                              |
| `HEAD`                | Ports, databases, caches, credentials, and any `.env` files you copied |
|                       | Decisions                                                              |

A few consequences:

- **A branch belongs to one worktree**: Git refuses to check out the same branch twice. That's an ownership signal, not an annoyance.
- **`.git` is a file in a linked worktree**: Scripts should ask Git with `git rev-parse --show-toplevel` or `--git-common-dir` instead of assuming `.git` is a directory.
- **The stash is shared**: Automation that pops `stash@{0}` might pop another worktree's work.
- **`git config --local` changes every worktree**: There's one repository configuration file.

Git handles exactly one boundary for you: who edits which files. Ports, databases, merging the changes back, and deciding when a worktree is safe to delete are your job.

## Things that will bite you

- **The base isn't what you think**: `isolation: worktree` (the setting that gives a subagent its own worktree) creates the worktree from your repository's default branch, not from the commit your session is on. Uncommitted and unpushed work never travels. Commit the foundation _and_ set `worktree.baseRef` to `"head"` in your Claude Code settings.
- **Agent teams ignore `isolation`**: Don't assume [teammates](agent-teams.md) are isolated from each other.
- **A fresh checkout isn't a ready environment**: Ignored files don't come along. Install dependencies per worktree, and list the ignored files you need copied (like `.env`) in `.worktreeinclude`, a Claude Code file at the repository root. Run the project's own check before anyone edits anything.
- **Passing against the wrong server**: [Playwright](https://playwright.dev)'s `reuseExistingServer` will happily run your tests against a dev server from a _different_ worktree. Fixed host ports in [Docker Compose](https://docs.docker.com/compose/) collide the same way, and a copied `.env` points every worktree at the same database.
- **Give each task its own resources**: A port, a database, a Compose project name, and a browser context. Serialize expensive builds behind a lock. Share the download cache, but never symlink `node_modules`.

Write one negative isolation test: a marker created in worktree A must be invisible from worktree B.

## Worktrees and parallel agents

[Claude Code](https://code.claude.com/docs/en/overview), [Codex](https://developers.openai.com/codex), [Cursor](https://cursor.com), and [GitHub Copilot](https://github.com/features/copilot) all have worktree modes. They differ on where worktrees live, what they're based on, and how cleanup works, so check your tool's defaults before you trust them.

Worktrees don't make conflicts go away. They move them to merge time. [In one study](https://arxiv.org/abs/2607.04697), pull requests from _different_ agents conflicted 41.7% of the time. So partition by ownership before you start any agents. If you can write down who owns what up front, the branches will probably merge cleanly. If you can't, overlapping ownership at least shows up as a visible merge conflict instead of two agents silently overwriting each other.

Then integrate serially: merge one, re-run the full suite, merge the next. Branches that pass alone can fail together, and when a merge breaks a check, stop and report the branch and the check. If two workers produced competing solutions, pick one; don't blend them. `git merge-tree --write-tree` predicts conflicts before you merge.

Anthropic [suggests three to five parallel sessions](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips). The real limit isn't Git, though. It's how much you can review, for reasons covered in [You are a load-sensitive component](verification-and-evidence.md#you-are-a-load-sensitive-component).

## Cleanup is an ownership decision

Deleting a worktree feels like housekeeping. It's actually a judgment that nobody still needs what's in there.

- **Age is not evidence of abandonment**: `git rev-list --count HEAD --not --remotes` tells you whether a worktree has commits that exist nowhere else. Dirty or unpushed means don't delete.
- **A clean `git status` isn't safe either**: `git worktree remove` deletes ignored files, like a local SQLite database, without asking.
- **Squash merges lie**: `git merge-base --is-ancestor` says the work never landed, because the original commits never become ancestors of `main`.
- **Let the model classify, and let a script delete**: The model is good at sorting worktrees into "obviously done" and "ask a human." A dry-run-by-default script you've read should do the `rm`.

The safe order: stop the task's processes and check status, including ignored files. Confirm the work landed, or preserve it with a push or [`git bundle`](https://git-scm.com/docs/git-bundle), and copy out any ignored files you need. Then run `git worktree remove` _without_ `--force`, and `git branch -d` as a separate step. Never `rm -rf` a worktree or rename its folder by hand: use `git worktree move`, and `git worktree list --porcelain -z` when a script needs to read the list.

A worktree is a folder with a branch, not a sandbox. Remove only the ones you made, and only when you can prove nothing is lost.
