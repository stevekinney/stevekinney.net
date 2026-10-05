---
title: Recovering a Failing Session
description: "The hard skill is knowing when to throw a session away. Ask one question before each patch, salvage a handoff, and know what /rewind can't undo."
---

You asked for a fix. It didn't work. You asked again. Now there's a second patch on top of the first, and the agent is confidently explaining why the _third_ idea will definitely do it.

The hard skill isn't repairing a session like this. It's knowing when to throw it away.

## Ask the causal-chain question

Before you apply the next patch, ask: _can I state exactly how this change breaks the causal chain between the cause and the symptom?_

If you can't, you aren't applying a diagnosis. You're placing another bet.

By the third failed attempt, you haven't made three bad patches. You've falsified your model of the system three times, and every rejected theory is still sitting in the context looking like a premise. (The _context_ is everything the model can see in the session: the conversation, the files it read, the instructions it loaded.) The agent keeps reasoning from it.

So the default is the original attempt plus two failed corrections, then `/clear`, which starts a new conversation with an empty context. Both `/clear` and its sibling `/compact` are covered in [Managing a Long Session](managing-a-long-session.md).

## Salvage, then clear

Before you clear anything, save what you learned:

- **Preserve the work before removing failed commits**: Run `git status --porcelain` first. Snapshot the plan, recovery notes, and every tracked or untracked change that should survive to a location outside the checkout, and verify the copy. Only use `git reset --hard <trusted-commit>` after the checkout is clean and the commits are yours to discard; it overwrites tracked changes and can remove obstructing untracked files. For already-pushed commits, use `git revert` from a clean checkout instead. The plan is a file the next session needs, so preserve it before either operation.
- **Write a recovery handoff**: The original goal, what's been ruled out, and the _one_ observation that disproved the last approach. Leave the failed diff out of it.
- **Start fresh with the handoff**: New session, empty context, and the handoff (plus the plan, if you kept one).

Leaving the diff out is the point. A failed diff pulls the new session back toward the old approach. The observation that killed it is what you actually want to carry forward.

## When there's no clean red or green

Sometimes you don't have a failing test to lean on, so you can't tell whether the session made things better or worse. Revert (go back to the last commit you trusted, discarding what the session changed) if two or more of these are true:

- Files were touched outside the task's scope.
- Tests are failing.
- There are schema or migration changes.
- There's a hunk (a block of changed lines in the diff) nobody can explain.

## When the agent breaks something

Sometimes it's worse than a failing test. The agent deleted something, or reset something, or ran a command you didn't expect. Your first instinct will be `/rewind`, so know how far it reaches.

`/rewind` covers a much smaller surface than people assume. It restores edits made by the agent's file tools. It does _not_ restore anything a Bash command did, like `rm`, `mv`, or `git reset --hard`. And it usually doesn't restore what a subagent (a helper agent with its own context) did.

My rule of thumb is that a recovery either works in the first ten minutes or it doesn't work at all, so move in this order.

If a credential was exposed, rotate it immediately, before anything else, even before you freeze the scene. Transcripts (the session logs the harness saves to disk) sit there in plaintext, so assume anything the agent printed is now stored somewhere. Investigate second. [Blast Radius](blast-radius.md) covers how to limit what an agent can reach in the first place.

Then freeze the scene. Stop the agent and every process that might write to the repository. Before any recovery mutation, snapshot the entire working directory, including uncommitted and untracked files, outside the checkout. Resolve the common Git directory with `git rev-parse --path-format=absolute --git-common-dir` and copy that directory too, preserving metadata. In a linked worktree, `.git` is only a pointer file; the common directory holds the objects, refs, reflogs, and `worktrees/<id>` administrative state. Also resolve `git rev-parse --absolute-git-dir` and verify its administrative files are covered by the backup. If those plumbing commands cannot run, snapshot the full repository and worktree layout without modifying it. [Git's worktree storage documentation](https://git-scm.com/docs/git-worktree#_details) explains what must survive.

Next, climb the recovery ladder: `git reflog`, `ORIG_HEAD`, `git fsck --lost-found`, the remote, another clone, your editor's local history. Anything that was ever staged is probably recoverable. Anything that wasn't, probably isn't.

Finally, end with a control. Ask, "What would have had to be true for this to get caught?" Then make it true. That might be a permission rule, a [hook](hooks.md), or a check in CI. A recovery without a prevention is half the job.

Two failed corrections after the original attempt means the session is done. Clear it.
