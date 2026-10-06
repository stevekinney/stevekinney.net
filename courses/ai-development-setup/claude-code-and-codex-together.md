---
title: Claude Code and Codex, Together
description: 'Use a second agent for uncorrelated errors, not extra IQ. Both directions shell out to headless mode, and the hard part is containing output, sandbox, and bill.'
---

Pairing two agents sounds like a free upgrade. It isn't, unless you're clear about why you're doing it. Reach for the other agent because it's _different_, not because it's better. A model from another lab fails in other places, so you're buying uncorrelated errors, not extra IQ.

The short version: almost every route shells out to the other agent's headless mode—`claude -p "…"` or `codex exec`, each of which runs one non-interactive session and exits. Even the plugins wrap that call. The one real exception is `claude mcp serve`, covered below. The real work is containing the other agent's output, its sandbox, and its bill.

## Calling Codex from Claude Code

There are two routes.

- **The easy way**: OpenAI's official [Codex plugin for Claude Code](https://github.com/openai/codex-plugin-cc). `/codex:review` and `/codex:adversarial-review` are read-only reviews. `/codex:rescue` hands Codex a task through a subagent. Long jobs take `--background`, then `/codex:status` and `/codex:result`. It drives your local Codex install and login.
- **The do-it-yourself way**: `codex exec --sandbox read-only`. `codex exec` is Codex's headless mode: it runs one non-interactive session and exits. Pin the sandbox explicitly: loaded user configuration can replace the default.

```bash
verdict_file=$(mktemp) || exit 1
trap 'rm -f "$verdict_file"' EXIT
if ! codex exec --sandbox read-only --ephemeral -o "$verdict_file" "Is the retry path in src/queue.ts safe?" < /dev/null; then
  echo "Review process failed" >&2
  exit 1
fi
if [ ! -s "$verdict_file" ]; then
  echo "Review produced no verdict" >&2
  exit 1
fi
cat "$verdict_file"
```

That pins a read-only shell sandbox (`--sandbox read-only`), runs one question with no saved session (`--ephemeral`), writes only the final answer to a file (`-o`), and closes stdin. A few habits make it dependable:

- **Read the `-o` file, not the stream**: It holds just the final message. Add `--output-schema schema.json` when code needs to act on the answer.
- **Close stdin and check the file**: `codex exec` appends anything on stdin to your prompt. When another agent or script launches it, stdin may never close, so Codex can wait forever or exit `0` having done no work, printing only `Reading additional input from stdin...` (the [`codex exec` docs](https://developers.openai.com/codex/noninteractive) cover the stdin behavior). Redirect stdin from `/dev/null`, write to a fresh `mktemp` path every time so a failed call can't reuse an earlier verdict, and require both a successful exit and a nonempty file. A reviewer that produced nothing hasn't approved anything. [Agent reviewers](verification-and-evidence.md#agent-reviewers) covers using agents as reviewers.
- **Control configuration**: `--ephemeral` only disables session persistence. Add `--ignore-user-config` when the review must exclude user configuration and its MCP servers too, as the [non-interactive reference](https://learn.chatgpt.com/docs/non-interactive-mode#permissions-and-safety) describes. Review any remaining project configuration and enabled tools separately; the shell sandbox does not constrain an external MCP service.
- **Contain it**: Call it from a [subagent](subagents.md) (a helper agent with its own fresh context) or a [skill](skills.md) that runs with `context: fork`, so Codex's output stays out of your main context. A plain skill loads into your current conversation, so it won't.

## Calling Claude Code from Codex

- **For a second opinion**: Run `claude -p "…" --permission-mode plan --output-format json --max-turns 5 --max-budget-usd 1`. Plan mode keeps it from editing. The caps keep it from wandering: `--max-turns` counts agentic turns (each model request and the tool calls it makes), and `--max-budget-usd` caps spend. Add `--json-schema` for a validated answer, which comes back in `.structured_output`.
- **For Claude Code's tools, not its judgment**: `codex mcp add claude-code -- claude mcp serve`, which runs Claude Code as an MCP server (a program that adds tools to a harness). Codex gets Claude Code's tools, including Bash, Edit, and Write, but not its judgment. That's a lot of power to expose, so scope it deliberately.
- **As a plugin**: There's no official one that I've found. Sendbird's community [`cc-plugin-codex`](https://github.com/sendbird/cc-plugin-codex) mirrors OpenAI's (`$cc:review`, `$cc:rescue`) and spawns a fresh `claude -p` per call.

## Things that will bite you

- **Sandboxes don't nest**: A sandbox is operating-system-level isolation for what an agent's shell commands can reach. On macOS, Codex can't start its own sandbox inside Claude Code's (`sandbox_apply: Operation not permitted`). Take the Codex call out with `sandbox.excludedCommands` and let Codex sandbox itself.
- **Redirects keep a call sandboxed**: Excluding a command from Claude Code's sandbox doesn't work if the command contains a redirect, even `< /dev/null`. So the `codex exec … < /dev/null` example above works from a terminal or script, but stays sandboxed and fails when Claude Code runs it directly. Put the redirect in a small wrapper script outside the repository, so nothing the agent edits can change what runs unrestricted, and exclude the wrapper.
- **Codex's sandbox has no network by default**: `claude -p` has to reach Anthropic. Approve the escalation, or set `network_access = true` under `[sandbox_workspace_write]`, which opens the network for everything Codex runs.
- **Two bills**: An `ANTHROPIC_API_KEY` in Codex's environment quietly moves `claude -p` onto per-token API billing.
- **Latency**: A consult can take minutes. Give the wrapper a timeout, and decide what happens when it fires.
- **Review gates loop**: Both plugins (OpenAI's for Claude Code and Sendbird's for Codex) offer an optional review gate, a hook that runs a review each time the agent tries to stop, and both warn it can drain your usage limits fast.
- **Pin and probe**: Pin the model (`-m`, `--model`), and rerun your first invocation by hand after you upgrade either CLI.

The sandbox and credential issues here are the same ones that make [blast radius](the-enforcement-ladder.md#blast-radius) worth planning for. Give the second agent the narrowest permissions that still let it answer.
