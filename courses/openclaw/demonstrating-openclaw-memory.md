---
title: Demonstrating OpenClaw's Memory
description: Teach OpenClaw something in one session, verify it wrote to disk, and prove it recalls the information in a brand new session.
---

Here's a simple demonstration of OpenClaw's persistent memory. The goal is to teach it something in one session, verify that it saved the information, and then test whether it remembers in a completely new session.

## Step 1: Tell OpenClaw to remember something

Paste this into your OpenClaw chat:

```text
I want to test your long-term memory.

Please remember the following information about me:

- My favorite fictional project is called Project Magpie.
- Project Magpie is a personal knowledge management application.
- Its technology stack is SvelteKit, TypeScript, Bun, and Neon Postgres.
- My favorite color for Project Magpie is burnt orange.
- I strongly prefer descriptive variable names over abbreviations.

Store this as durable memory so you can recall it in future sessions, not just from our current conversation.

After saving it, tell me:

1. Which memory file you updated.
2. What information you stored.

3. How you verified that the information was written successfully.
```

The fictional project gives us an easily recognizable test without mixing experimental information into your real preferences.

## Step 2: Verify that the memory was written

Don't accept "I'll remember that" as proof. Language models are exceptionally good at confidently reporting that they've done things.

Paste this next:

```text
Verify that you actually persisted the Project Magpie information.

Read the relevant memory file from disk using your available tools.

Show me the exact Markdown content containing the Project Magpie information and the full path of the file.

Do not answer based solely on our conversation history. If you cannot access or verify the file, say so explicitly.
```

Depending on how your agent is configured, it might store the information in `MEMORY.md`, a dated Markdown file under `memory/`, or another configured memory backend.

## Step 3: Start a completely new session

In OpenClaw, type:

```text
/new
```

This starts a fresh session without the previous conversation's active context.

Now ask:

```text
I'm starting a new conversation and want to check your long-term memory.

What do you remember about Project Magpie?

Specifically:
- What kind of application is it?
- What technology stack does it use?
- What color did I choose?
- What naming conventions do I prefer?

Use your persistent memory, not previous conversation history. Tell me which memory sources you used.
```

A successful response should correctly identify all four details without needing the original conversation.

## Step 4: Test semantic memory retrieval

This is the more interesting test because it checks whether OpenClaw can retrieve information when your question uses different wording.

```text
I'm considering restarting that fictional personal knowledge management application we discussed previously.

What technical choices and visual preferences had I settled on?

Search your persistent memory for relevant information. Don't guess if you can't find it.
```

Ideally, it should recover the project name, technical stack, and burnt-orange preference.

OpenClaw's `memory_search` can retrieve relevant memories semantically, while `memory_get` can read their original content.

## Step 5: Inspect memory independently

If you have terminal access to the machine hosting OpenClaw, inspect the underlying files:

```sh
cat ~/.openclaw/workspace/MEMORY.md
cat ~/.openclaw/workspace/USER.md
grep -Rni "Project Magpie" ~/.openclaw/workspace/memory/
```

The paths assume the default agent workspace. If your agent uses a custom workspace, substitute that location.

## What counts as success?

| Test                   | Expected result                              |
| ---------------------- | -------------------------------------------- |
| Initial memory request | Agent writes information to disk             |
| File verification      | The information exists in a memory file      |
| New session recall     | Agent correctly recalls the project          |
| Semantic retrieval     | Agent recalls details without exact keywords |
| Source verification    | Agent identifies the memory file it used     |

One caveat: a new session can still load long-term memory automatically. That's the intended behavior, not a failed test. The point is that the information comes from persistent storage rather than the previous conversation's active context.

The best proof is the combination of a verified disk write and successful recall after `/new`. Either one alone is weaker evidence.

OpenClaw's current documentation describes this file-backed approach in its memory overview.
