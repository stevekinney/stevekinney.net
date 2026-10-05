---
title: Blast Radius
description: "Prompt injection beats anything that relies on the model's judgment. Cut a leg of the lethal trifecta with OS, network, or architecture controls."
---

Every guardrail you add to an agent is either a request or a wall. A request is a line in `CLAUDE.md` (the instruction file Claude Code loads into context at the start of every session) or a sentence in a prompt. A wall is something the agent can't talk, trick, or reason its way past. When something goes wrong, the walls are what limit the damage, and that damage is what this lesson calls the blast radius.

The short version: the strongest controls are properties of the OS, the network, or the architecture. The ones that fail are properties of the model's judgment. Permission rules sit in between. They're deterministic harness configuration, not model judgment, so they're real controls. But they're weaker than the strongest kind, because a shell can route around a narrow pattern. `Bash(curl *)`, for example, isn't a network boundary.

## The lethal trifecta

Simon Willison's [lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) says an agent is exploitable when it has all three of these at once:

- **Untrusted content**: An issue, a web page, a dependency's README, an MCP tool result (the output of a tool served by a program that adds tools to the harness), a pull request from a stranger.
- **Private data**: Your source code, your secrets, your customers' data.
- **A way out**: Network access, a `git push`, a comment on a public issue.

The attack is called **prompt injection**: someone hides instructions in content the agent reads, and the agent follows them. Give that attacker private data to steal and a channel to send it through, and you've handed them everything.

A coding agent has all three by default. (A **harness** is the program wrapped around the model that gives it tools, permissions, and context. Claude Code and Codex are harnesses.) You don't get to choose whether that's true. You get to choose which leg to cut. And you cut it _structurally_, not with a more emphatic line in [`CLAUDE.md`](user-and-project-instructions.md). Telling the agent to ignore untrusted instructions is a request made to the very same faculty the payload is addressing.

## Auto mode is not a security boundary

Anthropic says so in writing. Auto mode is the permission mode (how much the agent may do without asking) where a classifier approves the actions it judges safe. When Johann Rehberger [published a working attack chain](https://embracethered.com/blog/posts/2026/breaking-claude-code-opus-5-and-automode/) against Claude Code in auto mode with a 60 to 80 percent success rate, Anthropic called auto mode "a convenience feature backed by a best-effort classifier, not a security guarantee."

It cuts down on prompt fatigue. It doesn't stop a determined payload. Use it for the first reason, not the second.

## Vectors you might not have considered

- **Deferred execution**: Can the agent write anything that something _outside_ the sandbox will run later? `core.fsmonitor` in a cloned repository's `.git/config` is a command that Git runs, outside the sandbox, with no prompt. Force it off for each Git command that handles the untrusted repository, for example `git -c core.fsmonitor=false status`. Inspect the setting with `git -c core.fsmonitor=false config --show-origin --get-all core.fsmonitor`, and prevent the agent from changing the repository's configuration. A global `false` is only a default: [Git reads local configuration later](https://git-scm.com/docs/git-config#FILES), so a local hook path can override it.
- **The allowlist is the exfiltration channel**: `gist.github.com`, `camo.githubusercontent.com`, and `huggingface.co` are all perfectly good places to put stolen data. If a domain accepts uploads and you've allowed it, it's a way out.
- **`Bash(curl *)` is not a network boundary**: There are a _lot_ of ways to make an HTTP request.
- **Tool output is input**: An MCP response can carry a prompt injection just as easily as a web page can. Tool poisoning is real, and so is the **rug pull**: a server that shows you a clean tool description when you install it and a poisoned one later.
- **Dependencies**: [In one study](https://arxiv.org/abs/2406.10279) of 576,000 samples, commercial models hallucinated package names at least 5.2% of the time, and open-source models 21.7%. Somebody can register those names. Meanwhile, a reviewer will happily approve a small source diff sitting next to a several-hundred-line lockfile diff (the file that pins exact dependency versions) they never read.

## Controls that actually cut a leg

- **Default-deny network egress**: Block outbound traffic (egress) unless it's on a list. That cuts the "way out" leg.
- **Whole-process isolation**: A container, or better, a virtual machine, with host credentials outside of it. That protects the host and unrelated secrets, but private source code and sensitive fixtures inside the guest are still private data. To cut that leg, use a sanitized workspace containing no sensitive data. If the task needs private data, pair isolation with default-deny egress instead of assuming the guest has nothing valuable to steal.
- **A reader/doer split**: A reader [subagent](subagents.md) with `tools: Read, Glob` processes the untrusted content. To cut the acting agent's untrusted-content leg, reduce the handoff to closed values, such as a fixed enum of classifications, and let deterministic code map those values to permitted actions. `additionalProperties: false` only restricts keys. An arbitrary string summary can still carry injected instructions, so schema-valid JSON alone is not a security boundary. Keep that text away from the acting agent, and independently authorize any consequential action.
  Planning before reading untrusted content can help keep the task focused, but it remains a prompting habit. The acting agent still sees the payload and can change its tool choices. Use it alongside structural controls; it does not remove untrusted content from the context or narrow a trust boundary.

## Secrets

The only safe credential is one the agent can't read.

- A sandbox (operating-system-level isolation for the agent's shell commands) still inherits your environment, and there's no built-in credential deny list. If you exported a token before launching, the agent can `echo` it.
- `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` removes recognized credentials from subprocess environments, including [hooks](hooks.md) and stdio MCP servers. It is not a complete credential boundary: the [environment-scrub reference](https://code.claude.com/docs/en/env-vars#what-the-subprocess-environment-scrub-removes) explicitly leaves GitHub tokens and authenticated proxy variables in place, and secrets with unrecognized names and values can survive. Launch the agent with a clean environment containing only the credentials it needs; keep sensitive credentials outside its process and use explicit `sandbox.credentials` denies where appropriate.
- `Read(.env)` is a permission rule that stops the agent reading that file, but it doesn't match `.env.local`. Use `Read(**/.env*)`.
- Secret scanners catch commits, not context. Transcripts sit on disk in plaintext.
- If something leaks: rotate first, investigate second.

I don't keep credentials in my shell at all. Anything that needs a token goes through a wrapper, like `with-turborepo-cache` or `with-linear-credentials`, that pulls the secret from the macOS Keychain (the operating system's built-in credential store), injects it for that one command, and never prints it. (Use the Keychain over 1Password for this. 1Password's command-line tool waits for Touch ID, which a background agent is never going to provide.)

## Practice what you preach

My own setup was the counterexample here. Codex was running with `sandbox_mode = "danger-full-access"` and `approval_policy = "never"` as global defaults, and my unattended automations had the _least_ boundary of anything I ran. That's exactly backwards. See [Routines and Schedules](routines-and-schedules.md) for what those unattended runs need.

Start sandboxed, raise autonomy per repository, and keep a prompt on the irreversible stuff: `git push`, `gh pr merge`, and `npm publish`.
