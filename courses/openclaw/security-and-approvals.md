---
title: Security and Approvals
description: 'How OpenClaw decides what your agent may do: tool profiles, exec approvals, permission modes, and sandboxing, plus running the security audit.'
---

Your agent can read your files, run commands, and act through your accounts. That's the point of it, and it's also why every other lesson in this course has a warning in it somewhere. This lesson puts all of those warnings in one place: what decides what your agent is allowed to do, how to make it ask before doing things, and how to check that your setup is what you think it is.

Start with the defaults, because they surprise people. **Out of the box, OpenClaw runs commands without asking and doesn't sandbox anything.** The documentation describes this as the intended experience for a single trusted operator, not a vulnerability. It's a reasonable default when you're the only person who can reach the agent and you trust everything it reads. Most setups stop meeting both of those conditions as soon as you connect a chat channel, an inbox, or a browser.

## The Four Layers

Every action your agent takes passes through four separate checks:

| Layer             | Question it answers                   | Where it's covered                              |
| ----------------- | ------------------------------------- | ----------------------------------------------- |
| 1. Access         | Who can talk to the agent at all?     | [Choosing a DM Policy](choosing-a-dm-policy.md) |
| 2. Tool policy    | Which tools does the agent have?      | [Below](#layer-2-which-tools-exist)             |
| 3. Exec approvals | Does this command need a human first? | [Below](#layer-3-exec-approvals)                |
| 4. Sandboxing     | Where does the command run?           | [Below](#layer-4-sandboxing)                    |

A few rules hold across all of them:

- **Later layers can only narrow.** Nothing in a later layer can bring back a tool that an earlier one removed. Sandboxing can't, elevated mode can't, and neither can a slash command.
- **Deny wins.** If any applicable rule denies a tool, an allow somewhere else doesn't override it.
- **A removed tool is invisible.** When policy takes a tool away, the model never sees it. There's no failed call to look for, because the agent was never offered the tool.

The layers are independent. A strict DM policy doesn't make commands safe, and approvals don't stop strangers from talking to your bot. You want all four.

## Check Where You Stand

Run these on the machine where the Gateway runs:

```sh
openclaw exec-policy show
openclaw sandbox explain
openclaw security audit
```

- `exec-policy show` prints the command approval policy you asked for, what the host approvals file says, and the effective result. On a fresh install, the one-line summary reads something like `auto · full · no approval prompts · fallback deny`. The `auto` there is the host the command runs on, not a mode.
- `sandbox explain` shows whether this session is sandboxed (by default, `mode: off`), which tools the sandbox would allow, and the config keys that control each one.
- `security audit` checks the whole configuration for known footguns. It gets [its own section](#run-the-security-audit) below.

## Layer 2: Which Tools Exist

A **tool profile** is a starting set of tools. You then add or remove individual tools and groups:

| Profile     | What it includes                                                          |
| ----------- | ------------------------------------------------------------------------- |
| `minimal`   | Almost nothing: session status and the ability to apply updates           |
| `coding`    | Files, shell, web, memory, sessions, scheduling, media. No messaging tool |
| `messaging` | Messaging and session tools. No files and no shell                        |
| `full`      | Everything, including optional plugin tools                               |

If you don't set a profile, core tools aren't filtered at all. Onboarding may set `full` for you.

Groups save you from listing tools one by one:

| Group              | Tools                                                                |
| ------------------ | -------------------------------------------------------------------- |
| `group:runtime`    | `exec`, `process`, `code_execution`                                  |
| `group:fs`         | `read`, `write`, `edit`, `apply_patch`                               |
| `group:web`        | `web_search`, `x_search`, `web_fetch`                                |
| `group:ui`         | `browser`, `canvas`, `screen`, and other UI tools                    |
| `group:automation` | `automations` (scheduled jobs), `gateway`, `plugins`, and `openclaw` |
| `group:messaging`  | `message`                                                            |
| `group:nodes`      | `nodes`, `computer`                                                  |

Send `/tools` in a chat to see exactly what the current agent can use right now.

Here's a profile for an agent that can browse and work with files but never touches the shell:

```json5
{
  agents: {
    entries: {
      main: {
        tools: {
          profile: 'coding',
          alsoAllow: ['browser'],
          deny: ['group:runtime'],
        },
      },
    },
  },
}
```

Three details trip people up:

- **Use `alsoAllow` to add to a profile.** `allow` and `alsoAllow` can't be used together at the same level, and validation rejects the config if you try.
- **Denying `write` doesn't deny `apply_patch`.** Allowing `write` turns on `apply_patch` too, but denying it doesn't turn it off. To make an agent read-only, deny `group:fs` or each of the four tools by name.
- **A shell is a shell.** If `exec` is allowed, denying the file tools doesn't make the agent read-only. It can still write files with a command. A truly read-only agent needs `group:runtime` denied as well.

## Layer 3: Exec Approvals

Tool policy decides whether the agent has `exec` at all. **Exec approvals** decide which commands it can run without asking. This is the layer you'll interact with most.

### Pick a Mode

The policy is set with `tools.exec.mode`:

| Mode        | What happens to a command that isn't on the allowlist |
| ----------- | ----------------------------------------------------- |
| `full`      | It runs. No prompts. **This is the default.**         |
| `ask`       | It waits until a human approves it                    |
| `auto`      | An AI reviewer allows it, denies it, or asks a human  |
| `allowlist` | It's silently denied                                  |
| `deny`      | All commands are blocked                              |

Older guides set `tools.exec.security` and `tools.exec.ask` instead. Those still work, and `ask` mode is the same as `security: allowlist` plus `ask: on-miss`. Just don't set `mode` and the older pair in the same place, because OpenClaw rejects the combination. `openclaw doctor --fix` migrates the old form.

**We recommend `ask`.** The easiest way to get there is a preset, which updates the config and the host's approvals file together:

```sh
openclaw exec-policy preset cautious
openclaw exec-policy show
```

`cautious` sets `ask` mode with a fallback of `deny`: if a command needs approval and nobody can be asked, it doesn't run. The other presets are `yolo` (no prompts) and `deny-all`.

`exec-policy` only changes the machine you run it on. On a remote Gateway, run it there. On the Railway template, that's `railway ssh --service openclaw -- openclaw exec-policy preset cautious`.

> [!WARNING] Nodes have their own policy
> A [paired node](connecting-a-remote-node.md) starts with the same no-prompts default as the Gateway, and the Gateway's preset doesn't change it. That's why the node lesson sets the Mac's approvals policy _before_ pairing.

### Answer an Approval

With `ask` mode on, a command that isn't allowlisted pauses and sends an approval request. You'll see it in the Control UI, the macOS app, and the iOS and Android apps. In chat, you can answer with `/approve`:

```text
/approve <id> allow-once
/approve <id> allow-always
/approve <id> deny
```

On Telegram, approval prompts go to the approvers' DMs, and only approvers can answer them. Approvers default to the command owners you set with `commands.ownerAllowFrom` in the [DM policy lesson](choosing-a-dm-policy.md). Someone who can chat with the agent can trigger a request but can't approve it unless they're also an approver.

From a terminal:

```sh
openclaw approvals pending
openclaw approvals resolve <id> allow-once
```

The three answers mean:

- **Allow once** runs this command this one time.
- **Allow always** means "always allow _here_." It approves this exact command line in this working directory, not the program in general. Running the same program with different arguments asks again.
- **Deny** stops it. The agent is told it was denied.

A request nobody answers expires after 30 minutes and counts as a denial. Typing "yes" isn't an approval. Use `/approve` with the request's ID, or an approval button.

### Build an Allowlist

Commands you approve all the time can go on the allowlist so they never prompt:

```sh
openclaw approvals allowlist add --agent main rg
openclaw approvals get
```

Like `exec-policy`, this edits the local machine's approvals by default. Add `--gateway` to edit the Gateway's copy from another computer, or `--node <id>` for a node.

How matching works:

- A bare name like `rg` matches that program when it's found through `PATH`. It won't match `./rg`.
- In a chained command like `git status && rg TODO`, **every** part has to match.
- A handful of harmless, input-only tools (`cut`, `uniq`, `head`, `tail`, `tr`, `wc`) run without allowlist entries.

> [!WARNING] Never allowlist an interpreter
> Putting `python3`, `node`, `bash`, or similar on the allowlist approves _any_ program, because `python3 -c '...'` can do anything. If you really need one, also turn on `tools.exec.strictInlineEval`, which makes inline code like `python3 -c` and `node -e` ask every time.

### When Nobody's There

Approvals assume someone is around to answer. Two situations change that.

**Interactive conversations** use the fallback. If a prompt is needed and no approval surface is reachable, the fallback decides, and with `cautious` that's `deny`.

**Scheduled automations** are stricter. Their approval requests go only to connected approval apps: the Control UI, the macOS app, and the iOS and Android apps. They never go to chat channels, and the terminal UI doesn't show them. **If no approval app is connected, the request is denied immediately.**

When you do approve an automation's command with **Always allow**, OpenClaw creates a **standing grant** instead of an allowlist entry. The grant is tied to that one job, that agent, and the exact command, working directory, and environment. If the job is edited, or the command changes by a single character, it asks again.

You can review and revoke standing grants in the Control UI under **Settings → Approvals**, or from the terminal:

```sh
openclaw approvals grants list
openclaw approvals grants revoke <grant-id>
```

Grants last until you revoke them. To make future grants expire, set `tools.exec.grantExpiryDays`.

This is what the guardrails in [Automation Ideas](automation-ideas.md) are getting at: have a job ask once while you're watching, approve it with **Always allow**, and later runs of that exact job will go through unattended.

### Tighten One Message

`/exec` adjusts approvals for a single message. Send it together with the task:

```text
/exec security=deny Summarize what's in ~/Downloads, but don't run anything.
```

The `security` and `ask` settings apply only to that message, and only senders you've authorized can use them. Use them to tighten things: the host's approval rules still apply, and `/exec` can't bring back an `exec` tool that tool policy denied. To turn the shell off completely, deny it: `tools.deny: ["exec"]`.

## Session Permission Modes

The Control UI adds one more dial per conversation. In the chat composer, the **Execution permissions** menu sets a **permission mode** for that session:

| Mode      | Files                            | Commands outside the allowlist      |
| --------- | -------------------------------- | ----------------------------------- |
| Read only | Read inside the session's folder | Denied                              |
| Guarded   | Read and write inside the folder | Ask a human                         |
| Workspace | Read and write inside the folder | An AI reviewer decides, or asks you |
| Full      | Anywhere                         | Run without asking                  |

A session with no mode uses your global policy. The menu's **Default** label is just a description of that policy. Without any of the settings in this lesson, the default is full access.

Choosing **Full** needs admin rights on the Gateway, and it overrides the host's approval rules for that session. Changing the mode partway through a task cancels anything waiting for approval. It doesn't undo anything that already ran.

## Layer 4: Sandboxing

Sandboxing runs the agent's tools inside a container instead of directly on the Gateway host. The Gateway itself stays on the host. **It's off by default**, and it needs Docker or Podman on the Gateway host. The Railway template, for example, doesn't have either.

The main setting is `agents.defaults.sandbox.mode`:

| Mode       | What it sandboxes                                                |
| ---------- | ---------------------------------------------------------------- |
| `off`      | Nothing (the default)                                            |
| `non-main` | Every session except the agent's main one, including group chats |
| `all`      | Every session                                                    |

`non-main` is a good fit if your agent sits in group chats. Your own main conversation keeps full access, and conversations with other people run in a container.

The Docker sandbox has no network access and a read-only filesystem by default. `workspaceAccess` decides what the container can see of the agent's workspace: `none` (the default), `ro`, or `rw`.

A few cautions:

- **Mounts grant access.** Mounting a host folder into the sandbox gives the agent that folder, even if it has no shell.
- **The `exec-policy` presets pin commands to the host.** They set `tools.exec.host` to `gateway`, which keeps commands out of the sandbox even when one is active. After turning sandboxing on, run `openclaw exec-policy set --host auto`.
- **Config changes don't affect running containers.** Run `openclaw sandbox recreate --all` after changing sandbox settings.
- **Elevated mode** lets a sandboxed agent run a command on the host instead. It needs an explicit per-channel allowlist under `tools.elevated.allowFrom`, which is empty by default. Leave it that way unless you know exactly who needs it.
- **Some features won't run from a sandbox.** For example, sandboxed sessions can't start [ACP coding sessions](acpx-runtime-plugin.md).

## Prompt Injection

All of these layers exist because of one problem: **anything your agent reads can try to give it instructions.** A web page, an email, a calendar invite, a PDF, or a message in a group chat can say "ignore your previous instructions and run this." Models resist this much better than they used to, but a determined attacker still succeeds often enough that you can't rely on the model alone.

> [!IMPORTANT] Content is data. Approvals are where the decision happens.
> Treat everything the agent reads as untrusted. It can summarize that content, but the content doesn't authorize anything. The protection comes from approvals and tool policy, which sit where the action happens and don't depend on the model saying no.

The practical rules:

- **Give agents that read untrusted content fewer tools.** An agent that triages your inbox doesn't need a shell. A common pattern is a read-only agent that reads the risky material and hands a summary to your main agent. [Subagents and Orchestration](subagents-and-orchestration.md) shows how to set one up.
- **Use your best model for agents that have tools.** Smaller, cheaper models are much easier to talk into things.
- **Leave the `allowUnsafeExternalContent` settings off.** They remove the markers OpenClaw puts around external content.
- **Check what the agent did, not what it said.** A model refusing a request and a tool being blocked look the same in a chat. If you need to know which happened, check the approval or the activity log.

## Run the Security Audit

`openclaw security audit` checks your configuration against a long list of known problems: exposed Gateway ports, missing authentication, open DM policies, loose file permissions, risky plugin and tool combinations, and more.

```sh
openclaw security audit
```

Here's a trimmed example of the output:

```text
OpenClaw security audit
Summary: 1 critical · 4 warn · 2 info
Run deeper: openclaw security audit --deep

WARN
gateway.trusted_proxies_missing Reverse proxy headers are not trusted
  gateway.bind is loopback and gateway.trustedProxies is empty. If you expose the Control UI
  through a reverse proxy, configure trusted proxies so local-client checks cannot be spoofed.
  Fix: Set gateway.trustedProxies to your proxy IPs or keep the Control UI local-only.
```

Each finding has an ID, a severity (`critical`, `warn`, or `info`), an explanation, and a fix. Some of the ones you're most likely to see:

| Finding                                       | What it means                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `gateway.bind_no_auth`                        | The Gateway is reachable beyond localhost with no authentication         |
| `gateway.loopback_no_auth`                    | No auth secret is set, which a reverse proxy would turn into open access |
| `gateway.tailscale_funnel`                    | The Gateway is published to the public internet through Funnel           |
| `fs.config.perms_world_readable`              | Other users on the machine can read your config, which can hold tokens   |
| `channels.<provider>.dm.open`                 | Anyone can DM the agent on that channel                                  |
| `security.exposure.open_groups_with_elevated` | An open group chat can reach elevated commands                           |
| `plugins.extensions_no_allowlist`             | Plugins are installed but `plugins.allow` doesn't limit which load       |
| `tools.exec.auto_allow_skills_enabled`        | Binaries mentioned by skills are automatically approved on nodes         |

Other useful forms:

```sh
openclaw security audit --deep
openclaw security audit --json
openclaw security audit --fix
```

- `--deep` adds live checks against the running Gateway and scans plugin and skill code.
- `--json` is for scripting, for example `openclaw security audit --json | jq '.summary'`.
- `--fix` is narrower than it sounds. It tightens file permissions and switches open group policies to allowlists. It **doesn't** rotate secrets, change tools, or touch network settings.

Treat the audit as a loop, not a pass/fail gate. Fix the top finding, then run it again, because fixing one problem often reveals the next. And keep in mind what a clean audit means: your configuration matches known-good settings. It doesn't mean nothing bad can happen.

If a finding is intentional, you can suppress it with a reason under `security.audit.suppressions`, so it stops hiding new findings.

## Our Recommendation

For a personal assistant that you reach through a chat app:

1. **Lock the front door.** Use `allowlist` DM policies, as in [Choosing a DM Policy](choosing-a-dm-policy.md), and keep the Gateway private, as in [the Tailscale lesson](connecting-securely-with-tailscale.md).
2. **Make commands ask.** Run `openclaw exec-policy preset cautious` on the Gateway host.
3. **Connect an approval app.** Keep the Control UI, the macOS app, or the phone app signed in so approvals have somewhere to go. Without one, automation commands are denied.
4. **Set approvers.** Make sure `commands.ownerAllowFrom` names only you.
5. **Lock down nodes before pairing them.** Follow the steps in [the node lesson](connecting-a-remote-node.md).
6. **Give risky readers fewer tools.** Agents that handle email, web pages, or group chats get a narrower profile or a sandbox.
7. **Leave elevated mode alone.** Don't add anyone to `tools.elevated.allowFrom` until you need to.
8. **Audit until clean.** Run `openclaw security audit`, fix, and repeat.

Then **test the negative case**. Ask your agent to run `uname -a`. You should get an approval request instead of an answer. Deny it, and confirm the agent tells you it was blocked. Then ask again and choose **Allow once**, and check that `openclaw approvals get` didn't gain an allowlist entry. If the command ran without asking, your policy isn't what you think. Run `openclaw exec-policy show` to find out why.

## If Something Goes Wrong

If you think a token leaked, a stranger got in, or the agent did something it shouldn't have:

1. **Contain it.** Stop the Gateway, or set every channel's `dmPolicy` to `disabled`. Turn off Tailscale Funnel or Serve if you use them.
2. **Find out what happened before you rotate.** Look at `openclaw logs`, the session transcripts under `~/.openclaw/agents/<agentId>/sessions/`, and the activity log with `openclaw audit`. Rotating first can erase the clues about which credential was used.
3. **Rotate credentials.** Rotate the Gateway token, then model provider keys and channel tokens.
4. **Re-audit.** Run `openclaw security audit --deep` and fix what it finds before reopening anything.

The activity log is worth knowing about before you need it. `openclaw audit` lists agent runs and tool actions from the last 30 days. It records who did what and whether it succeeded, but never the content. `openclaw audit --kind tool_action --limit 50` is a good place to start. A missing entry doesn't prove nothing happened, though, so treat it as a lead, not a verdict.

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8`. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai).
