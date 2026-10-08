---
title: Subagents and Orchestration
description: Delegate work to OpenClaw subagents, limit what each child can do with dedicated agents, and use patterns for fanning out research.
---

A **subagent** is a background run that your agent starts to handle part of a job. It gets its own session, works with its own context, and reports back when it's done. Your main conversation stays clean, several children can work at once, and each one can run on a cheaper model or with fewer tools than your main agent has.

Every OpenClaw install can do this. There's nothing to turn on. Ask your agent to "spawn a subagent" and it calls its `sessions_spawn` tool. In fact, OpenClaw nudges agents to delegate by default in their main session.

> [!NOTE] Subagents aren't ACP sessions
> [The ACPX lesson](acpx-runtime-plugin.md) covers handing work to an external coding harness like Claude Code or Codex. Those use the same spawn tool but are a different thing. This lesson is about native subagents, which run inside OpenClaw with OpenClaw's own tools and policies.

## How a Spawn Works

1. **Spawn.** Your agent calls `sessions_spawn` with a task. The call returns immediately with an ID; it doesn't wait for the child to finish.
2. **Run.** The child works in its own session, with a key like `agent:main:subagent:<uuid>`. It starts with a fresh context: the task, plus your `AGENTS.md`. It does **not** get `SOUL.md`, `USER.md`, `IDENTITY.md`, or `MEMORY.md`, so put anything the child needs to know in the task itself.
3. **Announce.** When the child finishes, its final answer is sent back to the parent with a status (`ok`, `error`, or `timeout`) and a stats line with runtime, tokens, and an estimated cost if you've configured model pricing. The status comes from what actually happened to the run, not from what the child said about itself.
4. **Archive.** The child's session is archived 60 minutes later by default.

While children run, the parent waits for their announcements instead of checking in on them over and over. A run ends, but its session sticks around until it's archived, so you can still read what it did.

## Try It: Your First Subagent

Send your agent something like this:

> Spawn a subagent to read `AGENTS.md` in your workspace and list every rule in it as a numbered list. Report back what it found.

Then look at what happened:

```text
/subagents list
/subagents info 1
/subagents log 1 tools
```

`list` shows active and recent children. `info` shows a child's status, timing, session ID, and transcript path. `log` shows its recent turns, and adding `tools` includes the tool calls it made. You can refer to a child by its number in the list or by its ID.

`/subagents` only lets you look. To stop work, send `/stop`, which stops the current run **and all of its children**. You can also click **Stop** in the Control UI. There's no `/subagents kill`.

> [!WARNING] Children outlive their parents
> A child isn't cancelled when the parent finishes its turn. If you start something big and change your mind, use `/stop`, or the children will keep working and spending tokens.

## What a Subagent Can't Do

Every subagent, no matter how it's configured, loses these tools:

- `message`: it can't message you or anyone else directly
- `cron` (automations): it can't schedule anything
- `gateway`: it can't change the Gateway's configuration
- `sessions_send`, `agents_list`, `session_status`, `progress_card`, and the `conversations_*` tools

You can't add these back. So a subagent can't text you at 3 a.m., leave a scheduled job behind, or reconfigure the Gateway.

**Everything else is inherited.** A subagent of your main agent gets the main agent's tool policy. If your main agent can run shell commands, so can its children, and nothing in the task text changes that. "Don't use the shell" in a prompt is a request. Tool policy is a guarantee.

## Limiting What Children Can Do

You have two levers.

### Lever 1: A Rule for Every Subagent

`tools.subagents.tools` filters tools for **all** subagents:

```sh
openclaw config set tools.subagents.tools.deny '["exec"]'
```

`deny` wins over everything. You can also set `allow`, which makes it an allow-only list. `allow` can only take tools away, though; it can't give a child a tool that the profile already removed.

This is blunt. It applies to every child, and any skill that shells out will stop working inside subagents. The failure tends to show up as a vague, worse answer rather than a clear permission error.

### Lever 2: A Dedicated Agent for Risky Work

The better tool is a **separately configured agent** that your main agent is allowed to spawn. A child spawned as another agent gets that agent's tool policy, workspace, model, and sandbox, not the parent's. That's the only way to give different children different powers.

Here's a `researcher` that can read and search the web but can't run commands, write files, or drive the browser.

**Step 1: Create the agent.** The `researcher` role comes with operating instructions suited to the job:

```sh
openclaw agents add researcher --role researcher --non-interactive
```

A role sets up the agent's workspace files and identity. **It doesn't restrict any tools.** That's the next step.

**Step 2: Give it a narrow tool policy.**

```sh
openclaw config set agents.entries.researcher.tools '{ profile: "minimal", alsoAllow: ["read", "web_search", "web_fetch"], deny: ["group:runtime", "write", "edit", "apply_patch", "browser"] }'
openclaw config set agents.entries.researcher.subagents.allowAgents '[]'
```

The empty `allowAgents` keeps the researcher from delegating to anyone else.

**Step 3: Let your main agent spawn it.** By default an agent can only spawn copies of itself.

```sh
openclaw config set agents.entries.main.subagents.allowAgents '["researcher"]'
openclaw config validate
```

The result looks like this in `openclaw.json`:

```json5
{
  agents: {
    entries: {
      main: {
        subagents: { allowAgents: ['researcher'] },
      },
      researcher: {
        // ...plus the workspace and identity that `agents add` created
        subagents: { allowAgents: [] },
        tools: {
          profile: 'minimal',
          alsoAllow: ['read', 'web_search', 'web_fetch'],
          deny: ['group:runtime', 'write', 'edit', 'apply_patch', 'browser'],
        },
      },
    },
  },
}
```

**Step 4: Use it.** Name the agent in your request:

> Use the researcher agent to find out when the next Node.js LTS release is scheduled. Return the date and a link to the source.

`/subagents list` should show a session key that starts with `agent:researcher:subagent:`. Web search only works if you've configured a search provider. Without one, the researcher can still read files.

This is the pattern the [security lesson](security-and-approvals.md#prompt-injection) recommends for untrusted content. The researcher reads the web pages and emails that might contain injected instructions, and it has no shell to follow them with. Your main agent only sees the summary.

## Caps and Budgets

These settings live under `agents.defaults.subagents`:

| Setting               | Default      | What it limits                                       |
| --------------------- | ------------ | ---------------------------------------------------- |
| `maxSpawnDepth`       | `5`          | How deep children can spawn their own children (1–5) |
| `maxChildrenPerAgent` | `5`          | Active children per session (1–20)                   |
| `maxConcurrent`       | `8`          | Children running at once from one session            |
| `runTimeoutSeconds`   | `0`          | How long a child may run. **`0` means no limit**     |
| `archiveAfterMinutes` | `60`         | When finished children are archived                  |
| `model`               | The parent's | Which model children use                             |

Two of these are worth changing:

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2,
        runTimeoutSeconds: 900,
        model: 'your-cheaper-model',
      },
    },
  },
}
```

- **A shallow depth** gives you workers that can't recruit more workers. Children at the maximum depth lose the spawn tools entirely.
- **A timeout** is a safety control as much as a cost control. There's no time limit by default.
- **A cheaper model** suits most delegated work, like reading, searching, and summarizing. Each child has its own context, so a fan-out of five children costs roughly five times as much as one.

Most of these can only be set in `defaults`. Per agent, you can set `model`, `thinking`, `allowAgents`, `delegationMode`, and `requireAgentId`.

## How Much Your Agent Delegates

`delegationMode` controls how strongly the agent is encouraged to delegate. Main sessions default to `prefer`, and everything else defaults to `suggest`. This only changes the agent's instructions. It doesn't schedule or force anything. If your agent spawns children for tasks that don't need them, turn it down:

```sh
openclaw config set agents.entries.main.subagents.delegationMode suggest
```

## Cross-Agent Access Is On by Default

Once you have more than one agent, two settings decide what they can see of each other:

| Setting                      | Default | What it does                                                                |
| ---------------------------- | ------- | --------------------------------------------------------------------------- |
| `tools.agentToAgent.enabled` | `true`  | Agents can read and message each other's sessions                           |
| `tools.sessions.visibility`  | `all`   | Which sessions the session tools can see: `self`, `tree`, `agent`, or `all` |

It's easy to assume these start closed. They start open, and they exist to _narrow_ access. If you add an agent that handles untrusted content, consider tightening them. The hardened baseline in the OpenClaw docs uses `visibility: "agent"` and `agentToAgent.enabled: false`. Test that your delegation still works after you change them.

## Patterns Worth Stealing

### Parallel Research

Split the work by independent source, require the same output from each child, and merge only when they're all done:

> I want a status update on project X. Spawn three subagents in parallel: one reads the repository's last week of commits, one reads open issues, and one reads the deployment log. Each one returns the same format: a three-bullet summary, a list of blockers, and a "sources" list. If a child can't reach its source, it must say "source unavailable" rather than guess. Wait for all three, then write one combined update.

Asking for "source unavailable" matters. Without it, a child that hits an error tends to fill the gap with something plausible.

### The Quarantined Reader

Have the [researcher](#lever-2-a-dedicated-agent-for-risky-work) read anything untrusted, and act on its summary yourself:

> Use the researcher agent to read the three newest emails from vendors and summarize what each one is asking for. Don't take any action. I'll decide what to do.

### A Team With a Coordinator

OpenClaw can create a ready-made team: a coordinator plus a researcher, a writer, and a reviewer.

```sh
openclaw agents team create --prefix team --non-interactive
openclaw agent --agent team-coordinator --message "Research the tradeoffs of SQLite vs. Postgres for a personal project and write a one-page recommendation."
```

The `--prefix` gives the four agents names like `team-researcher`, so they don't collide with the `researcher` you made above. If any of the names already exist, the command adds nothing.

The coordinator is allowed to spawn the three specialists and is told to prefer delegating. The specialists can't spawn anyone, so they can't loop on each other. The team doesn't change any tool policies, so give each specialist its own `tools` block as in [Lever 2](#lever-2-a-dedicated-agent-for-risky-work). Talk to the coordinator directly rather than spawning it, because it relies on tools that subagents don't get.

### Writer and Critic

Have one child draft and another review against a checklist, with you or the parent deciding between rounds. Keep the loop bounded by saying how many rounds are allowed. Agents that can reply to each other will happily keep going.

> [!NOTE] Two related features
> **Swarms** run many similar children from a small script and collect structured results. They're meant for five or more near-identical tasks and get [their own lesson](swarms.md). **Thread-bound subagents** give a child its own chat thread that you can talk to directly. They work on Discord and Matrix, but not on Telegram.

## Things That Bite

- **No timeout by default.** Set `runTimeoutSeconds`.
- **A restart doesn't relaunch work.** If the Gateway restarts mid-run, interrupted children are finished off as interrupted, not restarted. Check `/subagents list` and decide what still needs doing before asking again, or you may do the work twice.
- **Child output is evidence, not instructions.** A child that read a malicious page can return text that tries to steer the parent. Treat summaries with the same suspicion as the content they came from.
- **Sandboxes don't open up.** A sandboxed session can't spawn an agent that would run unsandboxed.
- **Stale agent names break spawns.** If you delete an agent that's still listed in `allowAgents`, spawns fail. `openclaw doctor --fix` cleans the list up.

## Try It Out

1. **Inspect a child.** Spawn the `AGENTS.md` reader from earlier and walk through `/subagents list`, `info`, and `log ... tools`.
2. **Ask a child what it has.** Spawn a subagent and tell it to list its own tools and which of your workspace files it can see. Compare its tool list with `/tools` in your main session. `message`, `cron`, and `gateway` should be missing.
3. **Take the shell away.** Run `openclaw config set tools.subagents.tools.deny '["exec"]'`, then ask a subagent to run `uname -a`. It should report that it can't. Undo it with `openclaw config unset tools.subagents.tools.deny`.
4. **Prove the researcher is locked down.** Ask the researcher agent to run `ls ~`. It should fail, while a web search succeeds.
5. **Hit the depth cap.** Set `agents.defaults.subagents.maxSpawnDepth` to `1`, then ask a subagent to spawn a subagent of its own. It shouldn't be able to, because at the maximum depth children don't get the spawn tool. Set it back to what you had before (the default is `5`).
6. **Fan out.** Run the parallel research prompt against something real, and check that every child returned the same format.
7. **Stop a tree.** Ask for a large fan-out, send `/stop` partway through, and confirm with `/subagents list` that the children stopped too.

## Troubleshooting

| Symptom                                                    | Check                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Spawning another agent is rejected                         | `subagents.allowAgents` on the agent that's doing the spawning                                    |
| A child used a tool you thought you'd blocked              | Same-agent children inherit the parent's policy. Use a dedicated agent or `tools.subagents.tools` |
| Adding a tool to `tools.subagents.tools.allow` did nothing | `allow` only removes tools. Add it to the profile with `alsoAllow` instead                        |
| A skill works in the main session but not in a child       | `exec` may be denied to subagents, or the skill isn't in the child agent's allowlist              |
| The child is missing context you thought it had            | Children only get `AGENTS.md` and the task. Put the rest in the task                              |
| No announcement ever arrived                               | `/subagents list` for its status, and whether it timed out or was stopped                         |
| Spawns fail after deleting an agent                        | `openclaw doctor --fix` to remove stale `allowAgents` entries                                     |

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8`. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai).
