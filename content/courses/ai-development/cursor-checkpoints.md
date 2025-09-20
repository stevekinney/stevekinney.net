---
title: Understanding Cursor Checkpoints for Safe AI Edits
description: >-
  Learn how Cursor's automatic checkpoints provide a safety net for AI-driven
  code changes and modifications.
modified: '2025-07-29T15:09:56-06:00'
date: '2025-07-29T15:09:56-06:00'
---

In Cursor, **checkpoints are automatic snapshots of the Agent's changes to your codebase**. They serve as a **disposable safety net** for AI-driven edits, allowing you to **undo Agent modifications if needed**.

## How They Work

- **Automatic Snapshots**: Checkpoints are automatically created by Cursor. Every time the Agent modifies your code, Cursor zips up the pre-change state into a checkpoint. In Agent mode, checkpoints are created before every code edit.
- **Local and Separate from Git**: Checkpoints are stored locally on your machine, in a hidden directory, and are **separate from your Git history**. This means they won't clutter your commit log with experimental or undone changes.
- **Agent-Specific Tracking**: Checkpoints **only track changes made by the AI Agent**. Manual edits you make by hand are not captured, so it's important to use Git for those.
- **Automatic Cleanup**: Checkpoints are kept for the current session and recent history, and are **automatically cleaned up**. This implies they are ephemeral and not intended for long-term version control.

## Restoring Checkpoints

You have a couple of ways to restore to a previous checkpoint:

- **From the Input Box**: You can click the "Restore Checkpoint" button on previous requests in the chat interface.
- **From the Message History**: When hovering over a message in the chat, a small "+" button appears, allowing you to click it to restore to that specific point.
- **Behavior**: Restoring a checkpoint will **reset all files to that point in the conversation**. If you want to continue from that reverted state, you can then write a new message to the AI agent.

## Purpose and Advantages

- **Safety Net for AI Edits**: Checkpoints provide an "Oh-crap button" for when the AI Agent makes unintended or "overzealous" changes, allowing you to easily roll back. This is crucial because AI can sometimes introduce errors or go "off the rails".
- **Facilitates Experimentation**: They enable fearless experimentation with AI-driven modifications without risking your main codebase or polluting Git history with temporary changes.
- **Cost Efficiency (Indirect)**: By allowing you to revert to a previous state, you might avoid re-running prompts that already worked correctly, potentially saving on token costs for regenerating lost work.
- **Granular Control**: They offer better control and command directives with the AI, especially useful when working with the Composer agent for multi-file changes.

## Limitations and Considerations

- **Not a Replacement for Git**: Checkpoints are **not version control** and should not be used as a substitute for Git for permanent history. Git offers durable, audited history, whereas checkpoints are disposable and for short-term use.
- **Manual Edits Not Tracked**: As mentioned, any changes you make manually will **not be included in the checkpoints**.
- **Ephemeral Nature**: Checkpoints are "wiped once they're no longer useful" and vanish after the session. If a folder is renamed, they may be lost.
- **Potential Token Costs**: While restoring itself doesn't cost, if you need to re-run prompts after restoring, it can still incur API costs.
- **UI/UX Challenges**: Some users have reported confusion and frustration with the checkpoint restoration UI, noting that its behavior can be unintuitive or "detrimental". The "Restore checkpoint" button may appear to restore to when the question was completed, not started, and getting fine-grained control to revert specific intermediate steps can be awkward. There have been instances where users felt compelled to downgrade Cursor versions due to these UI changes.
- **Community Solutions**: Due to some of these limitations, some users have created their own checkpoint scripts (e.g., saving project tree diffs) to have more robust local snapshotting capabilities that complement Git.

## Best Practices Related to Checkpoints

- **Commit Frequently with Git**: Always **commit your work to Git** before initiating any significant agentic task and immediately after a successful change. This creates reliable, documented "safe points" that can be instantly reverted if the agent goes awry.
- **Restore Early, Restore Often**: If you notice the AI Agent veering off course, **don't wait for a major disaster**. Roll back to a previous checkpoint as soon as you identify a problem to avoid more extensive issues and potentially save costs.
- **Treat as Scratch Space**: Use checkpoints liberally during exploratory refactoring or proofs-of-concept, treating them as temporary "scratch space" without cluttering your Git branches.
- **Combine with Rules and Notepads**: Leveraging Cursor Rules and Notepads can help guide the AI more effectively from the outset, potentially reducing the need for frequent rollbacks.
