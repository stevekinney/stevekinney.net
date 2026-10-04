---
title: Worktrees in Practice
description: 'Where parallel worktrees break: the wrong base, shared servers and databases, merge order, and cleanup that deletes work. Plus the safe removal sequence.'
---

[Worktrees](worktrees.md) look simple until the second agent starts a dev server. This lesson is the pile of things that go wrong in practice, then the discipline for merging and cleaning up without losing work.

## Things that will bite you

- **The base isn't what you think**: `isolation: worktree` (the setting that gives a subagent its own worktree) creates the worktree from your repository's default branch, not from the commit your session is on. Uncommitted work never travels, and neither do commits you haven't pushed to that default branch. The fix is to commit the foundation _and_ set `worktree.baseRef` to `"head"` in your Claude Code settings. That setting takes `fresh` (the default: start from the remote default branch) or `head` (start from your current commit).
- **Agent teams ignore `isolation`**: [Agent teams](agent-teams.md) (subagents that can message each other) ignore the setting, so don't assume your teammates are isolated from each other.
- **A fresh checkout isn't a ready environment**: Ignored files don't come along for the ride. Install dependencies per worktree. Use `.worktreeinclude` for the ones you actually need. It's a file at the repository root, with ignore-style patterns, that tells Claude Code which ignored files (like `.env`) to copy into worktrees it creates. It isn't a Git feature. Generated code, allowlisted `.env` files, Git LFS content (large files that Git stores outside its normal objects), and the instruction files (`CLAUDE.md` or `AGENTS.md`) all need attention too. Run the project's own check before anyone edits anything.
- **Passing against the wrong server**: [Playwright](https://playwright.dev) (a browser-testing tool) has a `reuseExistingServer` option that will happily run your tests against the dev server from a _different_ worktree. Cookies aren't scoped by port. [Docker Compose](https://docs.docker.com/compose/) project names change between worktrees, but fixed host ports don't. Write a negative isolation test: a marker created in worktree A must be invisible from worktree B.
- **Copying `.env` points every worktree at the same database.**
- **Expensive shared resources need a lock**: Serialize the big build behind a lock instead of letting five agents fight over it.
- **Freeze the base**: Fetch, record the base commit's full SHA (its complete hash), create the worktree, then confirm that `HEAD` matches that SHA and the status is empty. Now you know every task started from the same place.
- **Share the download cache, not `node_modules`**: Install per worktree. Symlinking `node_modules` across worktrees is asking for trouble.
- **Give each task its own resources**: A port, a database, a Compose project name, a queue prefix, and a browser context.

## Integrate one at a time

For each agent that writes code, record the path, the branch, the exact starting commit, what it owns, its checks, and its allocated ports and database. Then integrate serially: merge one, re-run the full suite, merge the next.

Branches that pass alone can fail together. And if two workers produced competing solutions, pick one. Don't blend them.

## Cleanup is an ownership decision

Deleting a worktree feels like housekeeping. It's actually a judgment about whether anyone still needs what's in there.

- **Age is not evidence of abandonment.** `git rev-list --count HEAD --not --remotes` tells you whether a worktree has commits that exist nowhere else.
- **Dirty and unpushed are terminal verdicts.** Don't delete.
- **A clean `git status` isn't safe either.** `git worktree remove` will delete ignored files, like a local SQLite database you kept in the worktree, without asking.
- **`git merge-base --is-ancestor` will lie to you after a squash merge.** A squash merge writes a new commit, so the original commits never become ancestors of `main`.
- **Let the model _classify_. Let reviewable, dry-run-by-default shell code _delete_.** The model is good at sorting worktrees into "obviously done" and "ask a human." A script you've read is better at the `rm`.

The safe order of operations:

1. Stop the task's processes.
2. Check the status, including ignored files.
3. Confirm the work landed (watch out for squash merges), or push it or save it with [`git bundle`](https://git-scm.com/docs/git-bundle).
4. Run `git worktree remove` _without_ `--force`.
5. Run `git branch -d` as a separate step.
6. Optionally, run `git worktree prune`.

And here are a few ways to make a mess:

- `rm -rf` instead of `git worktree remove`.
- Renaming a worktree folder outside of Git.
- Leaving work on a detached `HEAD` "for later."
- Using `--force` in scheduled jobs.

The thread running through all of them: **mistaking the directory for the boundary.**

Every worktree you create is one you own, so remove only the ones you made, and only when you can prove nothing is lost.
