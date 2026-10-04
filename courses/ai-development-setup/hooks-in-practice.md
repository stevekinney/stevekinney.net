---
title: Hooks in Practice
description: 'How hooks behave inside subagents, how to test and roll them out safely, the ways guards fail, and what real-world hooks look like in the wild.'
---

A hook that passes in your terminal can still fail where it matters: in a subagent, under a different permission mode, after a harness upgrade, or on the one input you didn't try. This assumes you've read [Hooks](hooks.md) and [Writing Good Hooks](writing-good-hooks.md).

## Hooks and subagents

A _subagent_ is a helper agent the main agent starts with its own fresh context. Hooks interact with it in a few specific ways:

- **Settings hooks fire inside subagents, too**: Only exit `2` or a JSON decision blocks there, as in [Hooks](hooks.md). One old report said they didn't fire at all. Its hook was exiting `1`, which never blocks.
- **Agent frontmatter hooks are scoped to the agent**: They live only while it runs, and its `Stop` becomes `SubagentStop`. Plugin agents drop them entirely.
- **`SubagentStart` can't block**: It's configured in settings and matched on the agent's name. It _can_ inject `additionalContext`, extra text for the conversation, before the subagent's first prompt.
- **`SubagentStop` can block with a reason**: That keeps the _same_ worker going, so it's the cleanest way to enforce a report shape.
- **`session_id` and `transcript_path` belong to the parent**: Use `agent_id` to detect a subagent.

## Testing and rolling out hooks

- **Pick the earliest boundary with enough information**: Run cheap checks after each edit. Save expensive tests for the end of a task (the `Stop` event) or for when work is submitted, like a commit.
- **Test in layers**: Pure policy, then the process boundary (stdin, stdout, exit code), then the real harness, then concurrency and injected failures.
- **Prove a block harmlessly**: Point a disposable tool at a marker file and check that a denied call never creates it.
- **Observe first**: Run new policies in observe-only mode. Log what the hook _would_ have blocked, and read the log before turning blocking on.
- **Keep a compatibility manifest**: Record the harness versions you've tested against and a set of sample payloads (fixtures).
- **Make your inner deadline shorter than the hook's timeout**: If your script gives up first, it fails the way you chose, not the harness's way.

### Re-run the fixtures after every upgrade

A release can change behavior your setup depends on without touching a single file of yours. Nothing in your configuration looks different, but it means something different now. For a hook, that might be when it fires or what its payload holds.

Here's an example from a subagent setting. Suppose a security-reviewer subagent sets `model: opus`, and a shell profile sets `CLAUDE_CODE_SUBAGENT_MODEL=haiku` to save money. Per the Claude Code changelog, before `2.1.251` that variable overrode everything, including the definition, so the reviewer ran on Haiku without anyone noticing. Version `2.1.251` made the variable the _default_, so the definition's `model:` wins. After the upgrade, with zero edits, the reviewer silently started running on Opus.

Checking that your settings file still parses won't catch that. Checking the _observed behavior_ will. A fixture here spawns the reviewer on a fixed prompt and records which model served it. Run it before and after an upgrade, and the difference shows up. For a hook, replay recorded payloads and compare the block or allow you observe.

Worth it? For a security or spend control, yes. For a low-stakes personal setup, no. It only catches what you fixtured, so keep skimming the changelog for hooks, subagents, and permissions.

## Ways guards fail

- **A stop hook with only a success path**: If the checks keep failing, a hook that always blocks the stop traps the agent. Give it a terminal-failure path that lets the stop through and reports the failure, plus a repair counter (blocked attempts, stored in a file you manage).
- **Interpolating filenames into shell source**: A filename containing `$(…)` is all it takes.
- **Assuming the sandbox contains hooks**: A sandbox is operating-system-level isolation that limits what files and network the agent's shell commands can reach. Hooks run on the host, outside it. Set `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` so processes Claude Code starts, hooks included, don't inherit your credentials.
- **Running with `--dangerously-skip-permissions`**: That flag skips every permission prompt. Hooks fire asynchronously in that mode, so commands can run before a guard can block them. That's an exception to "exit `2` blocks," so don't depend on a guard here.
- **Editing a Codex guard**: Codex trusts each hook by a hash of its definition, so an edited guard gets skipped until you trust it again. Running unattended with `--dangerously-bypass-hook-trust` doesn't fix that. It switches the trust check off, and the guard's protection goes with it.
- **Untrusted clones**: In headless mode (`claude -p`, one non-interactive session that exits) and SDK mode (Claude run from your own code), hooks committed to a repository run without the trust dialog that asks whether you trust the folder. Several 2026 Claude Code CVEs (published security vulnerabilities), like [CVE-2026-33068](https://advisories.gitlab.com/pkg/npm/@anthropic-ai/claude-code/CVE-2026-33068), targeted exactly this. [Blast Radius](blast-radius.md) covers limiting what a compromised hook can reach.

## Advanced techniques

- **Bounded continuation**: Claude Code overrides a `Stop` hook after 8 blocks in a row (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` changes that). Check `stop_hook_active`, which says you're already in a continuation, and keep your own retry budget. Codex documents no cap.
- **A stop-hook loop versus a fresh-context Ralph loop**: A Ralph loop starts a fresh agent for each task, in a loop. A stop-hook loop stays in one session, piles up context, and eventually fails through compaction, which replaces the conversation with a summary. Use the hook as a gate and fresh context for long iteration. See [The Ralph Loop](the-ralph-loop.md).
- **Concurrency**: Skip this unless your hooks touch shared state. Hooks for one event run in parallel, and sessions can share a resource. Lock the resource, not the session, atomically. Use idempotency keys, which let a retried operation be recognized and skipped. When work has to outlive the agent process, use an outbox (a queue a separate worker drains) with fencing tokens, increasing numbers that let you reject writes from a stale worker.
- **Classify failures before you retry**: If a hook's call to an outside service times out, ask the service whether it already did the work. Retry timeouts, not rejections.
- **Across tools** (Codex, Gemini CLI, Cursor, Copilot): Keep one pure evaluator and a thin adapter per tool, because timeout units, failure behavior, and trust models differ. Codex's `PreCompact` and `PostCompact` hooks, for example, can't inject context. Use a `SessionStart` hook with the `compact` matcher instead, which fires only after a compaction.

## Hooks in the wild

- **Formatter on edit**: A `PostToolUse` hook, as in [Boris Cherny's setup](https://x.com/bcherny/status/2007179832300581177).
- **Protected paths and command classifiers**: Tools like [`nah`](https://nahguard.ai/) classify shell commands and guard protected paths. Block when work is submitted, like a commit or push, and only hint on edits.
- **The stop-hook test gate**: A well-known bug here was a hook script that ended with `cat`. A shell script exits with its last command's status, and `cat` succeeds, so the script always exited `0` whatever the check found. The gate never blocked anything.
- **iTerm2's [`cc-status`](https://github.com/gnachman/iTerm2/blob/master/cc-status/Sources/cc-status/main.swift)**: A cosmetic status hook that knows about background tasks. It always exits `0` on purpose, because it must never block anything. That's a virtue here and a bug in a gate.
- **Also out there**: Re-injecting context after compaction, token savings with [Graft](https://github.com/NanoNets/Graft) (it rewrites `grep` calls to use fewer tokens), registering a session with a channel broker that relays outside events, like pull request activity, to it ([channels documentation](https://code.claude.com/docs/en/channels)), and reflection hooks that write the lesson from a mistake into `CLAUDE.md`.

The most useful hook is one you can explain in a sentence, test without invoking a model, and observe when it fails.
