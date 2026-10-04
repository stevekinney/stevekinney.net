---
title: Worktree Commands and Configuration
description: 'The Git commands, configuration keys, folder layouts, and advanced tricks that make worktrees predictable, from bare hubs to bisecting in a side checkout.'
---

Most people learn `git worktree add` and stop. That's enough for one worktree. It isn't enough when agents are creating and deleting them for you. This lesson is the reference shelf: the commands, the configuration that changes behavior across all of them, and the layouts worth choosing between. For the failure modes, see [Worktrees in Practice](worktrees-in-practice.md).

## Commands

The full [`git worktree`](https://git-scm.com/docs/git-worktree) command set is small:

- `add`: Creates a worktree.
- `list --porcelain -z`: Lists worktrees in a stable, machine-readable format, with entries separated by NUL characters. Use this in scripts, never the human-readable output.
- `lock` and `unlock`: Protect a worktree from being pruned or removed.
- `move`: Relocates a worktree. Don't move the folder yourself.
- `remove`: Deletes a worktree.
- `prune`: Cleans up records for worktrees whose folders no longer exist.
- `repair`: Fixes the links between a repository and its worktrees after something moved.

A few `add` flags earn their keep:

- `-b` with an explicit base: Creates a new branch from a starting point you name, instead of whatever `HEAD` happens to be.
- `--detach`: Checks out a commit without a branch.
- `--no-checkout`: Creates the worktree without populating files, so you can set up sparse checkout before anything lands.
- `--orphan` (Git 2.42+): Starts a branch with no history.
- `--lock --reason`: Locks the worktree at creation and records why.
- `--no-track`: Doesn't set up upstream tracking for the new branch.

## Configuration

- **Shared configuration**: `git config --local` changes _every_ worktree, because the repository's configuration file is shared.
- **Per-worktree configuration**: Needs `extensions.worktreeConfig`. Before you turn it on, move `core.worktree` and `core.bare` into the worktree's own configuration file. Older versions of Git refuse repositories that have this extension.
- **Relative paths (Git 2.48+)**: Let you move a repository and its worktrees together, and work inside containers. The cost is that older Git versions and some graphical clients can't open the repository.
- **Other keys worth knowing**: `gc.worktreePruneExpire` (how long Git waits before pruning stale worktree records; the default is three months), `worktree.guessRemote` (guess a matching remote branch when creating a worktree), and `includeIf "worktree:"` (Git 2.56), which applies configuration only to worktrees whose path matches a pattern.

## Layouts

- **Siblings** (`../app-feature`): The simplest option. Each worktree is a folder next to the main checkout.
- **Nested and gitignored** (`.worktrees/`, `.claude/worktrees/`): Self-contained, but some IDEs and indexers trip over it.
- **A bare hub** (`.bare` plus one folder per branch): A bare repository holds the Git data, and every branch is a worktree. You have to fix the fetch refspec (the rule that says which remote branches to download), or you get no `origin/*` branches.
- **Tool-managed**: Let the tool clean them up, not `rm`.

## Advanced techniques

- **Detached worktrees**: For frozen reviews and side-by-side regression checks.
- **Bisect in its own worktree**: Bisect refs are private to each worktree, so the hunt doesn't disturb your main checkout. In `bisect run`, exit code `127` means "command not found," but it counts as _bad_. Exit `125` tells bisect to skip.
- **Sparse worktrees**: Use `--no-checkout`, then `sparse-checkout set`, then an explicit `checkout HEAD`. You get a worktree with only the folders you named.
- **`refs/worktree/*`**: For private checkpoints that don't clutter the branch list.
- **A `post-checkout` hook that bootstraps new worktrees**: This is a Git hook, a script Git runs at set points, not a Claude Code hook. When `worktree add` creates one, the hook's old-`HEAD` argument is all zeros, which is how you tell "new worktree" from "ordinary checkout."
- **Conflict tooling**: `git merge-tree --write-tree` predicts conflicts before you merge. `rerere` reuses conflict resolutions you've already made. `range-diff` shows what a rebase actually changed.

Pick a layout once, let the tool or one script create every worktree, and never move a folder by hand.
