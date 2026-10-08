---
title: The ACPX Runtime Plugin
description: Install and configure the ACPX plugin so OpenClaw can run Claude Code, Codex, Gemini CLI, and other coding harnesses as managed ACP sessions.
---

OpenClaw can do a lot on its own, but sometimes the best worker for a job is a different agent entirely: Claude Code refactoring a repository, Codex working on a bug, Gemini CLI reading a codebase. You don't want to reimplement those. You want OpenClaw to **hand the task to them** and keep track of the result.

That's what the `@openclaw/acpx` plugin does. It's the official backend that lets OpenClaw launch an external coding agent (a **harness**) and manage it as a session.

## What ACP Is

**ACP** is the Agent Client Protocol, a standard way for one program to talk to an agent. In OpenClaw it points in two opposite directions, and the shared name causes confusion:

| Direction              | What it means                                             | Command        |
| ---------------------- | --------------------------------------------------------- | -------------- |
| **OpenClaw → harness** | OpenClaw launches and supervises an external coding agent | `/acp spawn`   |
| **Editor → OpenClaw**  | An ACP-aware editor uses OpenClaw as its agent            | `openclaw acp` |

This lesson is about the first one, **outbound**. The ACPX plugin is the piece that makes it work. In the case of Claude Code, the whole stack looks like this:

```text
OpenClaw ACP session control  →  ACPX plugin  →  Claude ACP adapter  →  Claude Code
```

OpenClaw supervises the work and exposes controls. The harness does the actual executing, using its own tools, its own permissions, and its own login.

### ACP Isn't a Subagent

OpenClaw also has native **subagents**, which run inside OpenClaw's own runtime. They look similar, since both use the same spawn tool, but they're different things:

|                 | ACP session                            | Native subagent                   |
| --------------- | -------------------------------------- | --------------------------------- |
| Runs on         | An external harness, through a backend | OpenClaw's own runtime            |
| Session key     | `agent:<agentId>:acp:<uuid>`           | `agent:<agentId>:subagent:<uuid>` |
| Controlled with | `/acp ...`                             | `/subagents ...`                  |
| Spawned with    | `sessions_spawn` with `runtime: "acp"` | `sessions_spawn` (the default)    |

Use ACP when the worker you want is specifically an external harness. Use a subagent when you just want bounded delegation inside OpenClaw. [Subagents and Orchestration](subagents-and-orchestration.md) covers those.

One more thing to keep straight: choosing an `openai/gpt-*` model doesn't select Codex, and naming a model after a harness doesn't make something ACP. For Codex specifically, OpenClaw's own native Codex plugin is the default way to bind a conversation. Codex over ACP is the explicit alternative, selected by `runtime: "acp"` and `agentId: "codex"`.

## Step 1: Install and Enable the Plugin

```sh
openclaw plugins install @openclaw/acpx
openclaw config set plugins.entries.acpx.enabled true
```

If you've restricted plugins with `plugins.allow`, `acpx` has to be on the list. If you denied it with `plugins.deny`, or you want to switch back to the packaged plugin from a local build, run the two commands above again.

## Step 2: Check That the Backend Is Healthy

From any chat with your agent, run:

```text
/acp doctor
```

It reports whether the backend is enabled and healthy. It also tells you if `acpx` is missing from `plugins.allow`, or if an adapter failed to download or start.

Here's what a healthy install looks like on a fresh Gateway, before any sessions have run (the IDs are trimmed):

```text
configuredBackend: acpx
activeRuntimeSessions: 0
runtimeIdleTtlMs: 0
evictedIdleRuntimes: 0
activeTurns: 0
queueDepth: 0
turnLatencyMs: avg=0, max=0
turnCounts: completed=0, failed=0
errorCodes: (none)
registeredBackend: acpx
runtimeDoctor: ok (embedded ACP runtime ready)
runtimeDoctorDetail: agent=codex
runtimeDoctorDetail: command=/usr/local/bin/node /data/.openclaw/acpx/codex-acp-wrapper.mjs --openclaw-acpx-lease-id probe-<lease-id> --openclaw-gateway-instance-id <gateway-instance-id>
runtimeDoctorDetail: cwd=/data/.openclaw/workspace
runtimeDoctorDetail: protocolVersion=1
healthy: yes
capabilities: session/set_config_option, session/set_mode, session/status
```

The lines worth reading:

- **`healthy: yes`** and **`runtimeDoctor: ok`** mean OpenClaw launched an adapter and completed the protocol handshake. That's the line you're checking for.
- **`registeredBackend: acpx`** confirms the plugin is the active backend.
- **`agent=codex`** is the harness the health check used. It's the probe agent, which defaults to the first entry in `acp.allowedAgents`, or `codex` if you haven't set one. A healthy result tells you about **that** adapter only. To check a different harness, set `probeAgent` (see Step 4).
- **`command=…/codex-acp-wrapper.mjs`** is a small launcher script that ACPX generated inside the Gateway's state directory. On the Railway template that's `/data/.openclaw`, which lives on the volume.
- **The counters** (`activeRuntimeSessions`, `turnCounts`, `errorCodes`, and so on) are all zero because nothing has run yet. They're how you'll see activity later.

A clean doctor doesn't prove the harness is signed in. It proves the adapter starts and speaks ACP. A missing or expired login shows up when a real turn runs, which is exactly what the exercises below are for.

## Step 3: Pick a Harness

Each harness has an ID that you pass when you spawn a session. The ones you're most likely to use:

| ID         | Harness                   |
| ---------- | ------------------------- |
| `claude`   | Claude Code               |
| `codex`    | Codex CLI                 |
| `gemini`   | Gemini CLI                |
| `copilot`  | GitHub Copilot CLI        |
| `cursor`   | Cursor CLI                |
| `opencode` | OpenCode                  |
| `openclaw` | OpenClaw's own ACP bridge |

There are many more (Droid, Kimi, Kiro, Qwen Code, and others). The plugin's documentation has the full list.

A few things to know about harnesses:

- **ACPX downloads adapters for you.** The ACP adapters for Claude and Codex are fetched with `npx` the first time you use them, so you don't install them by hand. If a download fails, `/acp doctor` says so.
- **The harness itself has to work on the Gateway host.** ACP is only the protocol. It doesn't install Claude Code or sign you in. The CLI must exist and be authenticated on the machine (and under the OS account) that runs the Gateway.
- **Model IDs aren't portable.** A model that exists in Claude Code isn't necessarily valid in Codex, so check the model against the harness you picked.

## Step 4: Configure ACP

There are two layers of configuration. The first is the core `acp` block, which turns the feature on and says which harnesses are allowed:

```json5
{
  acp: {
    enabled: true,
    backend: 'acpx',
    defaultAgent: 'codex',
    allowedAgents: ['claude', 'codex', 'gemini', 'opencode'],
  },
}
```

`allowedAgents` is worth setting. It's the allowlist of harnesses OpenClaw may spawn, so you only expose the ones you've actually installed and want to use.

The second layer lives under `plugins.entries.acpx.config`. These are the keys that matter:

| Key                             | Default                         | What it does                                                                |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `permissionMode`                | `approve-reads`                 | What the harness may do without prompting. See below.                       |
| `nonInteractivePermissions`     | `fail`                          | What happens when a prompt would appear but no one can answer it.           |
| `timeoutSeconds`                | `120`                           | Limit for startup and control operations.                                   |
| `probeAgent`                    | first allowed agent, or `codex` | Which harness the health check uses.                                        |
| `agents.<id>.command` / `.args` | built in                        | Override how a harness is launched.                                         |
| `pluginToolsMcpBridge`          | off                             | Expose installed plugin tools to ACP sessions.                              |
| `openClawToolsMcpBridge`        | off                             | Expose some built-in OpenClaw tools (starting with `cron`) to ACP sessions. |

Set them with `openclaw config set`:

```sh
openclaw config set plugins.entries.acpx.config.timeoutSeconds 180
openclaw config set plugins.entries.acpx.config.probeAgent claude
```

### Permissions Are the Part to Think About

`permissionMode` takes one of three values:

| Value           | Behavior                                                                |
| --------------- | ----------------------------------------------------------------------- |
| `approve-reads` | Reads are automatic. Writes and shell commands need a prompt. (Default) |
| `approve-all`   | Everything is automatic: all file writes and all shell commands.        |
| `deny-all`      | Every permission prompt is refused.                                     |

And here's the catch. An ACP session is **always non-interactive**, because there's no terminal for the harness to ask you in. So with the defaults, the first time a harness wants to write a file or run a command, there's nobody to approve it, and the run aborts with `PermissionPromptUnavailableError`.

You have a few ways to handle that:

- **Read-only work** (reviewing code, explaining a module, researching) works fine with the defaults.
- **Fail gently** by setting `nonInteractivePermissions` to `deny`. Blocked actions are refused and the harness carries on instead of aborting.
- **Writes and commands** need `approve-all`. It's the break-glass setting, and `openclaw security audit` flags it as a dangerous option, so be deliberate.

```sh
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
```

If you do use it, limit the blast radius. Point sessions at a disposable checkout or worktree with `cwd`, keep `acp.allowedAgents` short, and put it back to `approve-reads` when you're done.

> [!WARNING] These permissions are separate from OpenClaw's approvals
> ACPX permissions are not the same as OpenClaw's own [exec approvals](security-and-approvals.md#layer-3-exec-approvals), and neither is a substitute for the other. The harness has its own permission model, and ACPX maps onto it. Check what you've actually granted at each layer.

### The Tool Bridges Widen the Surface

By default, OpenClaw's tools aren't available inside a harness. `pluginToolsMcpBridge` changes that by exposing every active plugin tool as an MCP server. That puts those tools in reach of an external agent, with the same trust boundary as running the plugins in OpenClaw itself. Review what's installed before you turn it on, and bridge only what the workflow needs.

## Step 5: Start a Session

From chat, spawn a session by harness ID:

```text
/acp spawn claude
```

Then add flags to control how it behaves:

| Flag                         | What it does                                    |
| ---------------------------- | ----------------------------------------------- |
| `--mode oneshot\|persistent` | One-off task, or a session that keeps going     |
| `--cwd <absolute-path>`      | The working directory the harness runs in       |
| `--label <name>`             | A name so you can tell sessions apart           |
| `--bind here\|off`           | Pin the current conversation to the session     |
| `--thread auto\|here\|off`   | Create or use a thread or topic for the session |

`--bind` and `--thread` can't be used in the same command. For example:

```text
/acp spawn codex --mode oneshot --thread off
/acp spawn codex --mode persistent --thread auto
/acp spawn codex --bind here
```

### One-Shot vs. Persistent

- **One-shot** runs a bounded task. The parent agent owns the result and decides how to tell you about it.
- **Persistent** keeps a session alive so follow-up messages go to the same harness, with its state intact. This is what you want for an ongoing coding session.

### Spawning From the Agent

Your agent can start these sessions itself with the `sessions_spawn` tool:

```js
sessions_spawn({
  runtime: 'acp',
  agentId: 'claude',
  task: 'Review the open TODOs in src/ and summarize which are still relevant.',
  cwd: '/workspace/my-project',
  label: 'todo-review',
});
```

It accepts these parameters: `task`, `runtime`, `agentId`, `thread`, `mode`, `cwd`, `label`, `resumeSessionId`, `streamTo`, `model`, and `thinking`. In this form, `mode` is `"run"` (the default, one-shot) or `"session"` (persistent, which requires `thread: true`). Always say `runtime: "acp"` explicitly. Without it, you get a native subagent.

To pick up an earlier harness session instead of starting fresh, pass its ID as `resumeSessionId`. OpenClaw replays that session's history, but only for IDs that belong to the requester and match the backend and harness. Resuming is not the same as replaying all of OpenClaw's context into the harness.

### Binding a Conversation

With `--bind here`, a chat is pinned to the ACP session. Anything you send goes to the harness, `/new` and `/reset` reset it in place, and `/acp close` removes the binding. Bindings survive Gateway restarts.

This only works on channels that support it. At the time of writing, that means Discord threads and channels, and Telegram topics (forum topics in groups and DM topics). Everywhere else, OpenClaw tells you it's unsupported. If you want a Telegram or Discord conversation to always be a particular harness, you can also make it permanent in config:

```json5
{
  agents: {
    ownership: 'explicit',
    entries: {
      claude: {
        runtime: {
          type: 'acp',
          acp: { agent: 'claude', backend: 'acpx', mode: 'persistent', cwd: '/workspace/repo' },
        },
      },
    },
  },
  bindings: [
    {
      type: 'acp',
      agentId: 'claude',
      match: {
        channel: 'telegram',
        accountId: 'default',
        peer: { kind: 'group', id: '-1001234567890:topic:42' },
      },
      acp: { label: 'claude-repo' },
    },
  ],
}
```

Settings resolve in this order: the binding's own `acp.*` values, then the agent's `runtime.acp.*`, then the global `acp` defaults.

### Controlling Running Sessions

The `/acp` command has more subcommands than `spawn`:

```text
/acp spawn | cancel | steer | close | sessions | status | set-mode | set | cwd
     | permissions | timeout | model | reset-options | doctor | install | help
```

Use `cancel` to stop a run, `steer` to nudge a harness that's already working instead of restarting it, `sessions` and `status` to see what's running, and `close` to end a session. Runtime controls require owner identity, so you have to be the command owner (see [Choosing a DM Policy](choosing-a-dm-policy.md)). Run `/acp help` for the exact syntax of each, since it can vary by version.

When a one-shot run finishes, the result reports back to the parent agent, which usually rewrites it in its own voice. Finishing the work and delivering the message are separate events, so a finished harness doesn't guarantee a message in your chat.

## Try It Out

Reading about ACP only gets you so far. These exercises go from a harmless smoke test to a harness writing code, so you can see each behavior described above for yourself. Do them in order, since each one builds on the setup before it.

### Before You Start

Make an empty scratch directory for the harness to work in. Everything below that writes anything happens here, and nowhere else:

```sh
mkdir -p ~/acp-playground
```

On the Railway template, create it on the volume as the Gateway's user instead:

```sh
railway ssh --service openclaw -- as-node mkdir -p /data/scratch/acp-playground
```

Wherever you put it, note the **absolute path**. The examples below call it `<scratch>`.

Then run `/acp doctor` and make sure it says `healthy: yes`. Keep the output handy. You'll compare it at the end. You'll also need to be the command owner, since the `/acp` runtime controls are owner-only.

You'll be asking your agent to start sessions in plain English. Always say "ACP" and name the harness. If you don't, the agent may reach for a native subagent instead, and then you're not testing what you think you are.

### Exercise 1: A Read-Only Smoke Test

This proves the whole chain works, from your agent to the plugin to the harness, without letting anything change. Under the default `approve-reads` mode, reads are automatic, so no configuration is needed.

Send your agent:

> Use `sessions_spawn` with `runtime: "acp"` and `agentId: "codex"` to list the files in your workspace and summarize what's there. Read-only, no changes.

What to look for:

- A reply summarizing the workspace, which came from the harness and was relayed by your agent.
- If it fails with an authentication error, the harness isn't signed in on the Gateway host. Fix the login before continuing.
- Run `/acp doctor` again. The counters should have moved, and `turnCounts` should show a completed turn.

### Exercise 2: Same Question, Two Harnesses

Different harnesses give different answers, in a different style, at a different speed. Ask the same read-only question of two of them and compare.

> Spawn two ACP sessions, one with `agentId: "codex"` and one with `agentId: "claude"`, both with `cwd` set to your workspace. Ask each: "What are the three most important files here, and why?" Read-only. Then show me both answers side by side and note any differences.

What to look for:

- Whether both harnesses actually start. If only one does, the other is missing from `acp.allowedAgents`, isn't installed, or isn't signed in.
- How the answers differ. This is the point of ACP: you're picking a worker with a particular strength.
- A "model not found" error if you asked one harness for another's model. Model IDs aren't portable.

### Exercise 3: Watch a Write Fail

Now see the permissions behavior firsthand, rather than taking it on faith. With the defaults still in place, ask for something that has to write:

> Spawn an ACP session with `agentId: "codex"` and `cwd: "<scratch>"`. Ask it to create a file called `hello.txt` containing "hello from ACP".

With `approve-reads` and `nonInteractivePermissions: fail`, the harness needs approval to write, nobody can give it, and the run aborts.

What to look for:

- `PermissionPromptUnavailableError`.
- No `hello.txt` in the scratch directory.

Now try the gentler option. This doesn't grant any new access. It just changes how the refusal behaves:

```sh
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions deny
```

Repeat the request. The write should still be refused, but this time the harness continues and tells you it couldn't, instead of aborting the whole run.

### Exercise 4: Let It Write, Safely

To get real work out of a harness, you have to grant write access, so do it deliberately and as narrowly as you can. This is the break-glass setting, so only do it with `cwd` pointed at the scratch directory:

```sh
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
```

Then send your agent:

> Spawn an ACP session with `agentId: "claude"` and `cwd: "<scratch>"`. Ask it to write a small script called `fizzbuzz.js` that prints FizzBuzz for 1 to 20, run it, and report the output.

What to look for:

- `fizzbuzz.js` in the scratch directory. Open it and check it yourself.
- The harness running the script and reporting real output, which is a shell command with no approval prompt. That's what `approve-all` means.
- That nothing outside `<scratch>` changed.

**Now put it back.** Don't leave this on:

```sh
openclaw config set plugins.entries.acpx.config.permissionMode approve-reads
```

Run `openclaw security audit` and confirm it no longer flags `approve-all`.

### Exercise 5: A Persistent Session You Can Talk To

One-shot runs are good for a single task. A persistent session lets you hold a conversation with the harness, which is closer to using Claude Code directly. Start one:

```text
/acp spawn claude --mode persistent --thread auto --cwd <scratch>
```

On Discord or Telegram, `--thread auto` creates a thread or topic for the session. On a channel without thread support, you can try `--bind here` instead to pin the current conversation to it. If a channel doesn't support binding, OpenClaw says so. In that case, use a one-shot session and ask your agent to continue it.

Chat with it:

1. Ask it to describe `fizzbuzz.js`.
2. Follow up with something that depends on the first answer, like "now change it to count to 30". That proves it kept its state.
3. Check what's running with `/acp sessions` and `/acp status`.
4. Close it with `/acp close`.

What to look for:

- The follow-up works without you repeating context.
- Closing the session removes the binding. Anything you type afterward goes to your normal agent again.

You'll need `permissionMode approve-all` again for the edit to land. Turn it on for this exercise, and turn it back off afterward.

### Exercise 6: Steer and Cancel

Real tasks go wrong halfway. Practice correcting a harness mid-run instead of restarting it. Start a task that takes a little while:

> Spawn an ACP session with `agentId: "codex"` and `cwd: "<scratch>"`. Ask it to write a README for this folder with a section on every file, in as much detail as it can.

While it's working:

1. Use `/acp steer` to redirect it, for example by asking it to keep each section to two sentences. Run `/acp help` if you need the exact syntax.
2. Start another long task and stop it with `/acp cancel`.
3. Confirm it actually stopped with `/acp status`.

What to look for:

- A steered run changes course without starting over.
- A cancelled run really settles. Cancelling has two halves, the control plane and the external process, so confirm the result instead of assuming it.

### Exercise 7: Prove It Isn't a Subagent

The earlier comparison table is easy to skim past. This makes it concrete. Ask your agent for the same simple task twice:

> First, spawn an ACP session with `agentId: "claude"` to explain what `fizzbuzz.js` does. Then spawn a native subagent, with no `runtime: "acp"`, to do the same.

Then inspect each:

```text
/acp sessions
/subagents list
```

What to look for:

- The ACP session key looks like `agent:<agentId>:acp:<uuid>`.
- The subagent key looks like `agent:<agentId>:subagent:<uuid>`.
- Each shows up under its own command. That's how you can tell which runtime owns a piece of work.

### Exercise 8: Break It on Purpose

Knowing how it fails is half of knowing how to use it. Try each of these, read the error, and fix it:

1. **Not allowed.** Set `acp.allowedAgents` to just `["codex"]`, then ask for `claude`. The spawn should be rejected.
2. **Bad directory.** Spawn with a `cwd` that doesn't exist.
3. **Wrong runtime.** Ask for a harness without saying `runtime: "acp"` and see what you get.

When you're done, restore `allowedAgents` to the harnesses you actually want, and check that the scratch directory is the only place anything was written.

### When You're Finished

Run through this list:

- [ ] `permissionMode` is back to `approve-reads`.
- [ ] `nonInteractivePermissions` is set the way you want it long-term (`fail` is the default).
- [ ] No sessions are left running: check `/acp sessions`.
- [ ] `/acp doctor` still reports `healthy: yes`, and its counters reflect everything you just did.
- [ ] `openclaw security audit` is clean.

## Boundaries You Should Know About

- **ACP sessions run on the host, not in OpenClaw's sandbox.** OpenClaw's sandbox policy doesn't wrap a harness. The harness is governed by its own CLI permissions and its `cwd`, while OpenClaw enforces the feature gates, the allowlist, session ownership, and delivery.
- **Sandboxed sessions can't spawn ACP at all.** If the requesting session is sandboxed, both `/acp spawn` and `sessions_spawn({ runtime: "acp" })` are blocked, and `sandbox: "require"` isn't supported. If you need sandbox-enforced work, use a native subagent.
- **Logins are access.** Once a harness is signed in on the Gateway host, an agent can use that account. A signed-in Claude Code or Codex can edit code and push it, which makes prompt injection more consequential.
- **Uncertain starts need inspection.** If a spawn times out or the Gateway restarts, don't just retry. The harness may have started and changed files. Check the session and its task first.

## ACP and Mac Nodes

If you've [paired your Mac as a node](connecting-a-remote-node.md), a natural question is whether OpenClaw can now drive Claude Code on it. **Not through ACP.** ACP and nodes are separate mechanisms, and nothing in OpenClaw's documentation connects them.

### What Runs Where

| Piece                                  | Where it runs                                                                        |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| **An ACP harness** (Claude Code, etc.) | The Gateway host's runtime, outside OpenClaw's sandbox                               |
| **A paired Mac node**                  | Only the commands and capabilities you approved, called by the Gateway               |
| **Native Codex with placement**        | Codex's brain stays on the Gateway, and its commands and file access run on the node |

So with a remote Gateway, `/acp spawn claude` starts Claude Code on the Gateway's server, against files that exist there. Your Mac's repositories aren't in reach, and the docs for ACP, session hosting, and node exec don't describe running an ACP harness on a node.

The node approval prompt lists a couple of things that might look related, like "Sessions: Claude, Codex." I couldn't find documentation saying what those do, so don't read them as support for ACP on the Mac.

### What Does Work: Native Codex on a Node

There's a documented way to run a coding agent on a paired device, but it's for **Codex, through its native runtime**, not through ACP. In OpenClaw's terms it's **placement**: the Gateway keeps Codex's app-server, the model connection, and the transcript, while Codex's shell commands, file access, and HTTP requests happen on your Mac. The node runs `codex exec-server` in a session workspace, and the changes it makes are reconciled back into a worktree the Gateway owns.

A few things to know before you try it:

- **It's controlled with `/codex`,** not `/acp`.
- **The work happens in a managed workspace,** which the Gateway creates and syncs. It isn't a folder you point at on your Mac. A new session starts from an empty workspace, a GitHub repository, or a checkout on the Gateway, and you don't browse the device's filesystem to choose it.
- **You don't need to sign in to Codex on the Mac.** Provider credentials stay on the Gateway, and the node gets a fresh private home directory and a sanitized environment.
- **Requests that carry credentials are refused on the node.** Anything that needs a bearer token or cookies has to run on the Gateway.

Setup has three parts. First, enable the Codex plugin on **both** the Gateway and the Mac (and add `codex` to `plugins.allow` on either one that uses an allowlist). Second, allow the node command on the Gateway, because it's high-risk and isn't allowed by default:

```json5
{
  gateway: {
    nodes: {
      commands: {
        allow: ['codex.exec-server.stdio.v1'],
      },
    },
  },
  plugins: {
    entries: {
      codex: {
        enabled: true,
      },
    },
  },
}
```

Third, turn on session hosting on the Mac. It's a node-local setting, and the docs I could find for it only show the basic form:

```json5
{
  nodeHost: {
    workerRuns: { enabled: true },
  },
}
```

Then restart the app or node host. Because the node's command set changed, reconnect it and approve the new request from the Gateway:

```sh
openclaw nodes pending
openclaw nodes approve <requestId>
```

Choose the paired device in the **Place** picker when you start a new session in the Control UI. From the command line, you can dispatch an existing managed-worktree session to a device:

```sh
openclaw gateway call sessions.dispatch \
  --params '{"key":"agent:main:device-work","deviceId":"<paired-device-id>"}'
```

**Every launch needs your approval.** Starting the exec-server shows a critical approval prompt. **Allow once** covers one launch. **Allow always** covers later launches only while the placement stays exactly the same, lives in the Gateway's memory, and is wiped when the Gateway restarts. Allowing the command in config doesn't skip the prompt.

If the connection drops or you cancel the turn, the attempt ends and its remote processes are killed. Reconnecting starts a fresh attempt. It never resumes the old one.

> [!WARNING] Approval is not a sandbox
> Once you approve a launch, the process can reach anything your Mac account can reach. The working directory only sets where it starts. Pair only devices you trust, and if you want real isolation, run the node under a separate least-privilege macOS account.

This feature is relatively new, and the documentation doesn't say which operating systems are supported or give the node-side keys beyond the basic form above. Check the [Codex placement page](https://docs.openclaw.ai/plugins/codex-harness/placement) for your installed version before you rely on it.

### What About Claude Code on the Mac?

There's no documented placement for Claude Code. You have three realistic choices:

| You want…                                                 | Do this                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code working on repositories that live on your Mac | Run the Gateway on the Mac, so the Gateway host _is_ the Mac and ACP runs there                                                                       |
| Claude Code working on a copy, with the Gateway remote    | Keep using ACP on the Gateway host, with a scratch checkout there, and bring the results back through Git                                             |
| One-off commands on the Mac                               | Run the CLI as an ordinary command with `/exec host=node`, allowlisting the binary first with `openclaw approvals allowlist add --node <id> "<path>"` |

That last option is a shell command, not an ACP session. You'd lose session tracking, `steer` and `cancel`, bindings, and the rest of the ACP controls, and the docs give no guidance for running a coding CLI that way. I haven't tried it, so treat it as an experiment, and keep the allowlist as narrow as you can.

### Choosing

| You want…                                            | Use…                                 |
| ---------------------------------------------------- | ------------------------------------ |
| Any ACP harness (Claude Code, Gemini CLI, and so on) | ACP, which runs on the Gateway host  |
| Codex doing work on the Mac, with the Gateway remote | Native Codex placement on the node   |
| Claude Code on your Mac's own repositories           | A Gateway running on that Mac        |
| OpenClaw's own coding sessions on the Mac            | Session hosting on the paired device |

## Using It on Railway

If you followed the [Railway lesson](running-openclaw-on-railway-with-tailscale.md), the template already includes `claude` and `codex`, and `HOME` is on the volume, so logins survive redeploys. Claude Code picks up `ANTHROPIC_API_KEY` from the service's variables when it's set, which is how the template's `coding-agent` skill works. To use a subscription instead, sign in from a `railway ssh` shell as the Gateway's user:

```sh
railway ssh --service openclaw
as-node claude auth login
```

Run the plugin commands the same way you run other OpenClaw commands there:

```sh
railway ssh --service openclaw -- openclaw plugins install @openclaw/acpx
railway ssh --service openclaw -- openclaw config set plugins.entries.acpx.enabled true
```

The template's sandbox-free container makes the permissions section matter even more. A harness running with `approve-all` there can reach the volume, which holds tokens and history. Keep it pointed at a scratch directory.

## Troubleshooting

| Symptom                                          | What to check                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `/acp doctor` says the backend is blocked        | `plugins.allow` is set but doesn't include `acpx`                                              |
| The spawn is rejected for that harness           | The ID isn't in `acp.allowedAgents`                                                            |
| The harness never starts                         | Its CLI isn't installed on the Gateway host, or isn't signed in under the Gateway's OS account |
| `PermissionPromptUnavailableError`               | The harness needed to write or run something. See the permissions section                      |
| "Model not found"                                | That model ID doesn't exist for this harness. IDs aren't portable                              |
| The `cwd` is rejected                            | It doesn't exist or isn't accessible. Use an absolute path, or omit it                         |
| Spawning is blocked from a sandboxed session     | ACP can't be started from a sandboxed requester. Use a subagent                                |
| A Codex session isn't behaving like native Codex | You're on Codex over ACP, not the native Codex plugin. They're different runtimes              |

## Choosing the Right Path

| You need…                                    | Use…                     |
| -------------------------------------------- | ------------------------ |
| OpenClaw-native, bounded delegation          | A native subagent        |
| An external coding agent managed by OpenClaw | ACP with the ACPX plugin |
| Codex-native chat binding and control        | The native Codex plugin  |
| Your editor talking to a Gateway session     | `openclaw acp`           |

> [!NOTE] Commands and flags change
> This lesson follows OpenClaw's documentation for `2026.9.x`. The supported harness list and the exact `/acp` subcommand syntax change often, so run `/acp help` and check the [ACP agents documentation](https://docs.openclaw.ai/tools/acp-agents) before relying on a specific flag.
