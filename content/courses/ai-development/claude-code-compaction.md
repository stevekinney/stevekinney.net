---
title: Claude Code Compaction
description: Manage context windows and reduce token costs by compacting conversation history into focused summaries while preserving key information
modified: 2025-07-29T14:20:58-06:00
---

Compacting in Claude Code is a **feature designed to manage the conversation's context window**, which is the amount of information the AI agent can process at one time.

As your conversation with Claude Code grows longer and longer, more data accumulates in the context window. Since every subsequent message you send includes the entire previous context, this can lead to increasing token costs and potential degradation of response quality as the model tries to keep track of a vast amount of information.

## Why It Even Exists

The primary purpose of compacting is to **reduce token usage** and prevent the context window from becoming overwhelmed. It helps maintain focus and ensures that the agent doesn't "forget" initial instructions or deviate from the plan during long or complex tasks.

When you use the `/compact` command, Claude Code **takes your entire current conversation history and creates a summary of it**. It then starts a new chat session with this summary preloaded as the new context. This allows the agent to retain important information and key decisions from the previous conversation without having to carry forward every single message.

## When to Use It

- **Manual Trigger**: You can manually run `/compact` at any time, especially when you are continually working through a problem and want a smaller, more focused context for the model. It's recommended to do this when you finish a task to avoid unrelated tasks piling up in the same chat.
- **Automatic Compaction**: Claude Code has an auto-compact feature that triggers when the context window reaches approximately **95% capacity** (or 25% remaining). This is a built-in mechanism to prevent hitting the context limit and causing the system to "break" or "go off the rails". However, users often advise against waiting for auto-compact, as it can sometimes lead to the agent losing important context and spiraling out of control.

## Benefits

- **Reduced Token Usage and Cost**: By summarizing lengthy conversations, compacting directly reduces the number of tokens sent with each new message, leading to **lower operational costs**.
- **Improved Focus and Stability**: It helps Claude Code stay on track, preventing it from getting lost in details or deviating from objectives in long conversations. This makes the overall development experience more stable.
- **Context Preservation**: Unlike clearing the context completely, compacting preserves the essential nuances and key information, allowing you to pick up where you left off without significant disruption.

You can provide specific instructions to customize what Claude summarizes when using `/compact`, such as summarizing only to-do items, the last conversation, or limiting the summary to a certain word count.

## Compared to using `/clear`

Compacting is distinct from the `/clear` command. While `/clear` completely wipes out the chat history and starts a brand new conversation from scratch, `/compact` summarizes the conversation and preloads that summary as the new context. Use `/clear` when you want a completely fresh start, and `/compact` when you need to retain key information from a previous discussion.

Auto-compacting can sometimes take a while, so manual compacting when you have time is suggested.
