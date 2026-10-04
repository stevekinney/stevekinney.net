---
title: Worktrees
description: 'A worktree gives each agent its own files and branch, but not its own ports, databases, secrets, or decisions. Know which of the four boundaries Git covers.'
---

Run two agents in the same checkout and they'll step on each other's edits within minutes. The usual fix is a [Git worktree](https://git-scm.com/docs/git-worktree): an extra checkout of the same repository in its own directory, with its own files and branch. Each agent gets its own working files, and nobody overwrites anybody.

That's the value proposition, and it's real. Worktrees separate working trees and indexes (the staging area where Git collects the next commit). They still share a repository, and they may share ports, databases, caches, and credentials. So worktrees reduce file collisions, but they do _not_ isolate services, ports, databases, secrets, or decisions.

This is, by a wide margin, my single largest source of agent friction. In two months, my worktree guard (a hook, meaning a script the harness runs before a tool call, that refuses commands which would escape the agent's own worktree) refused 465 commands. And `gh pr merge --delete-branch` failed 95 times in a single month because another worktree owned `main`. That's the [GitHub CLI](https://cli.github.com) command that merges a pull request and deletes its branch. It switches your local checkout to `main` first, and Git refuses to do that while another worktree has `main` checked out.

## What's shared and what isn't

| Separate per worktree | Shared across all of them                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| The working files     | The repository's objects and refs (the stored commits, branches, and tags) |
| The index             | Stashes (Git's shelf for set-aside changes) and configuration              |
| `HEAD`                | Ports, databases, and caches                                               |
|                       | Credentials, and any `.env` files you copied                               |
|                       | Decisions                                                                  |

Git refuses to check out the same branch in two worktrees. That's not an annoyance, it's an ownership signal. Whichever worktree has a branch owns it.

Also: in a linked worktree, `.git` is a file, not a directory. Some tools are not ready for this.

A bit more detail on what's what:

- **Main versus linked**: The main worktree is the one `clone` or `init` created. Each linked worktree has a one-line `.git` _file_ pointing at `.git/worktrees/<id>/`. Scripts should ask Git where things are with `git rev-parse --show-toplevel`, `--git-common-dir`, and `--git-path`, and never assume `.git` is a directory.
- **Also private to each worktree**: Git's internal bookkeeping pointers, like `ORIG_HEAD`, `refs/bisect`, `refs/worktree`, and `refs/rewritten`, plus sparse-checkout patterns (the rules that limit which files get checked out).
- **Also shared**: Git hooks (scripts Git runs at set points, not harness hooks) and `info/exclude` (the repository's local ignore list). And yes, the stash, which is why automation that pops `stash@{0}` is a bad idea. You might pop another worktree's work.
- **Looking at the same commit somewhere else**: Use `--detach` to check out a commit without a branch. Don't make `--force` a habit.

## The four boundaries

There are four boundaries in play when you run parallel work in worktrees:

- **Editing**: Who changes which files.
- **Execution**: Which ports, databases, caches, and processes each task uses.
- **Integration**: How the finished changes come together.
- **Lifecycle**: How worktrees get created, owned, and cleaned up.

Git handles exactly one of them: editing. It gives you commands for lifecycle (`add`, `remove`, `prune`), but not the policy of who owns a worktree and when it's safe to delete. Execution and integration are entirely your job. [Worktrees in Practice](worktrees-in-practice.md) walks through each, and [Worktree Commands and Configuration](worktree-commands-and-configuration.md) covers the Git side.

## Worktrees and parallel agents

[Claude Code](https://code.claude.com/docs/en/overview), [Codex](https://developers.openai.com/codex), [Cursor](https://cursor.com), Gemini CLI, and [GitHub Copilot](https://github.com/features/copilot) all have worktree modes. They differ on where the worktrees live, what they're based on, how ignored files get copied, and how cleanup works. Check which defaults your tool picks before you trust them.

Worktrees don't make conflicts go away. They move them to merge time. [In one study](https://arxiv.org/abs/2607.04697), pull requests from _different_ agents conflicted 41.7% of the time, versus 19.8% for pairs from the same agent.

Anthropic [suggests three to five parallel sessions](https://support.claude.com/en/articles/14554000-claude-code-power-user-tips). Git isn't the real limit, though. The real limit is how much you can review, plus machine capacity and budget. [You Are a Load-Sensitive Component](reviewing-agent-work.md#you-are-a-load-sensitive-component) explains why your own attention is the bottleneck.

A worktree is a folder with a branch, not a sandbox. Don't mistake one for the other.
