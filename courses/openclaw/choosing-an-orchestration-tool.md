---
title: Choosing an Orchestration Tool
description: "A map of OpenClaw's ways to run work without you: automations, goals, standing intents, subagents, swarms, Lobster, and webhooks, plus what replaced TaskFlow."
---

By now you've seen several ways to get work done without typing every step: scheduled automations, subagents, ACP coding sessions, Lobster workflows, swarms. They overlap, and it's not always obvious which one a job calls for. This lesson is the map. It also covers three smaller tools that haven't had a lesson of their own (goals, standing intents, and inbound webhooks) and explains what happened to TaskFlow.

## What Happened to TaskFlow

If you've read older OpenClaw guides, you've seen **TaskFlow** and the **Tasks ledger**. The Tasks ledger was a shared record of all detached work, and you inspected it with `openclaw tasks list`. TaskFlow added durable multi-step "flows" on top of it, with stages, waits, and linked child tasks.

**Both were removed in OpenClaw `2026.9.7`.** The project's reasoning was that the ledger duplicated state that each runtime already tracks for itself. Automations keep their own run history, subagents track their own children, and ACP sessions manage their own lifecycle. The docs sum it up as: each runtime owns execution and completion.

What that means in practice:

- `openclaw tasks` no longer exists. Running it gets you `OpenClaw does not know the command "tasks"`.
- Old task and flow records stay in the database but nothing reads them, and nothing converts old flows into something else.
- If you used the **TaskFlow Webhooks** plugin, its config is now ignored with a `plugin removed: webhooks` warning. `openclaw doctor --fix` cleans it up.

Here's where each old job went:

| You used to...                            | Now use                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Check on delegated work with `tasks list` | `/subagents list`, `info`, and `log` ([Subagents](subagents-and-orchestration.md))  |
| Check scheduled runs with `tasks list`    | `openclaw automations runs <job-id>`                                                |
| Stop work with `tasks cancel`             | `/stop`, the **Stop** button in the Control UI, or `/acp` controls for ACP sessions |
| Wait for several children to finish       | Let the parent wait for their announcements, or use a [swarm](swarms.md)            |
| Run a multi-step flow with approval gates | A [Lobster workflow](lobster-workflows.md)                                          |
| Wait for an outside event                 | An automation with a trigger script, or an [inbound webhook](#inbound-webhooks)     |
| Track one long objective                  | A [goal](#goals)                                                                    |
| Audit what ran                            | `openclaw audit`                                                                    |

One gap is real. Nothing today replaces a durable, revision-tracked flow that coordinates work across different runtimes. Lobster is the closest fit for multi-step work, but its saved state is a set of files on disk, not a shared ledger.

## The Map

| Tool                                        | Starts when                                 | Good for                                           |
| ------------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| [Scheduled automation](automation-ideas.md) | A clock, an interval, or a condition script | Briefs, digests, watchers, reminders               |
| Heartbeat                                   | Every 30 minutes, on your main session      | Ambient "anything need my attention?" checks       |
| Standing order                              | Always loaded from `AGENTS.md`              | An ongoing responsibility, paired with a schedule  |
| [Standing intent](#standing-intents)        | Something specific comes up in conversation | "When X comes up, remind me about Y"               |
| [Goal](#goals)                              | You set one in a session                    | One concrete outcome pursued over many turns       |
| [Subagent](subagents-and-orchestration.md)  | Your agent decides to delegate              | A few independent pieces of work in parallel       |
| [Swarm](swarms.md)                          | Your agent runs a fan-out script            | Five or more similar tasks with structured results |
| [ACP session](acpx-runtime-plugin.md)       | Your agent hands work to a coding harness   | Real coding work in Claude Code, Codex, and others |
| [Lobster workflow](lobster-workflows.md)    | Your agent or an automation runs a pipeline | A fixed recipe with steps that need sign-off       |
| [LLM Task](llm-task.md)                     | A workflow needs one structured answer      | Classifying, extracting, or deciding, as JSON      |
| [Inbound webhook](#inbound-webhooks)        | An outside service calls your Gateway       | Reacting to events from other systems              |

They're meant to be combined. A weekly report might be a standing order that says what the agent owns, an automation that wakes it on Fridays, a Lobster workflow that gathers data and pauses before sending, and an LLM Task step inside that workflow that classifies each item.

## How to Choose

Ask these in order:

1. **Does it happen at a particular time?** Use a scheduled automation.
2. **Does it happen when something comes up in conversation?** Use a standing intent.
3. **Does it happen when another system says so?** Use an inbound webhook. If your Gateway is private, use an automation that checks every few minutes instead.
4. **Is the sequence of steps known in advance, with side effects that need your sign-off?** Use Lobster. If one step needs a judgment call, make it an LLM Task step.
5. **Can the work be split into independent pieces?** For a few, use subagents. For many similar ones, use a swarm.
6. **Does it need a real coding harness?** Use ACP.
7. **Is it one outcome you'll chip away at over a long conversation?** Set a goal.
8. **Is it an ongoing responsibility?** Write a standing order and schedule it.

If you're unsure, start with a plain conversation. Promote it to a tool once you've done the same thing by hand three times.

## What Survives a Restart

The tools differ in what happens when the Gateway restarts and in how approvals reach you. That matters most for anything that runs while you're away.

| Tool            | After a restart                                                     | Approvals                                                       |
| --------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Automation      | Jobs and history persist. Missed jobs are rescheduled               | Go to connected approval apps only. None connected means denied |
| Goal            | Persists with the session. `/new` and `/reset` clear it             | A goal never approves anything                                  |
| Standing intent | Persists in the agent's database                                    | Only command owners can create one                              |
| Subagent        | Interrupted runs are finished off as interrupted, not restarted     | Wait for a decision like any other run                          |
| Swarm           | Collectors are subagents. Don't automatically re-run a batch        | A collector never asks. Anything needing approval is denied     |
| Lobster         | A paused run's state is saved to disk, so you can resume it later   | Built in: a step that needs approval pauses until you answer    |
| Inbound webhook | Repeated requests with the same idempotency key replay the same run | Treated as unattended, like an isolated automation              |

## Goals

A **goal** is one objective attached to the current session. It stays visible to the agent on every turn until it's done, so a long conversation doesn't drift away from what you were trying to finish.

```text
/goal start Draft a one-page plan for migrating my blog to a new host, with a cost estimate
/goal
/goal pause waiting on hosting quotes
/goal resume
/goal complete
/goal clear
```

What to know:

- **One per session.** Starting a second fails with `goal already exists` until you clear the first.
- **The agent can only finish or block it.** It can mark the goal complete, or blocked after reporting the same blocker three turns in a row. Only you can pause, resume, edit, or clear it.
- **`/new` and `/reset` clear it,** because they start a fresh session.
- **It isn't a scheduler or a queue.** A goal doesn't run anything on its own, and it doesn't approve anything.

## Standing Intents

A **standing intent** is a reminder tied to an event instead of a time. Just ask for one:

> When I mention the launch checklist, remind me to confirm who owns the rollback.

The next time a message contains those words, the reminder is added to the agent's context and it brings it up. Matching is a keyword check, not a model call, so it doesn't get fuzzier as the conversation gets longer.

The defaults are deliberately cautious: each intent fires at most 3 times, waits 24 hours between fires, and expires after 90 days. By default it only applies in the channel and with the person where you created it. Only command owners (`commands.ownerAllowFrom`) can create one, and you have to do it from a chat channel.

Ask the agent to list your standing intents to see their status, and to cancel one by name. The agent never cancels one on its own.

## Inbound Webhooks

**Inbound webhooks** let another service start an agent turn by calling your Gateway over HTTP. They're off by default. To turn them on, add this to your config with a long random token that you use only for hooks:

```json5
{
  hooks: {
    enabled: true,
    token: '<long-random-hook-token>',
    path: '/hooks',
    allowedAgentIds: ['main'],
    allowRequestSessionKey: false,
  },
}
```

`allowedAgentIds` limits which agents a caller can reach. Without it, `openclaw security audit` warns that any authenticated caller can route to any agent.

The 200 response from a webhook only means the request was accepted. It doesn't mean the run finished, unless you ask the request to wait, as shown in exercise 4 below.

> [!WARNING] A private Gateway can't receive outside webhooks
> GitHub, Stripe, and similar services can't reach a Gateway that's only on your tailnet, as in [the Railway lesson](running-openclaw-on-railway-with-tailscale.md). Webhooks still work from machines inside your tailnet. For outside services, an automation that polls is usually the safer choice.

## Try It Out

These all run against your real Gateway.

### 1. Take Inventory

Before adding anything, see what's already running:

```sh
openclaw automations list --all
openclaw audit --limit 20
```

Then, in a chat with your agent:

```text
/subagents list
/goal
```

You should see at least the system heartbeat job in the automation list. Note anything you don't recognize and find out what created it.

### 2. Carry a Goal Through a Conversation

Pick something that takes a few turns, like the blog migration plan above. Start it with `/goal start ...`, work on it for three or four messages, and check `/goal` along the way to see the status and token use. Pause it, send an unrelated message, and confirm the agent doesn't keep working on the goal. Resume it, finish, and run `/goal complete`.

Then start another one and send `/new`. Run `/goal` and confirm it's gone.

### 3. Set a Standing Intent and Trip It

From Telegram, as the command owner:

> When I mention "dentist", remind me that I need to reschedule my cleaning.

Then send a message that mentions your dentist. The agent should bring up the reminder. Send another one right away; the 24-hour cooldown means it shouldn't remind you again. Ask the agent to list your standing intents and confirm the intent shows that it has fired once. Then ask it to cancel the intent, and list them again to confirm it's cancelled.

### 4. Send Your Gateway a Webhook

Enable hooks with the config above, then validate and restart. Run these on the Gateway host:

```sh
openclaw config validate
openclaw gateway restart
```

From the Gateway host, send a test event that waits for the result but doesn't deliver anything to your chat:

```sh
curl --include http://127.0.0.1:18789/hooks/agent \
  -H 'Authorization: Bearer <long-random-hook-token>' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: webhook-smoke-001' \
  --data '{"message":"Summarize this test event: the sample import completed.","name":"Webhook smoke test","agentId":"main","deliver":false,"waitForCompletion":true}'
```

You should get HTTP `200` with a `runId` and a `completion` object whose `status` is `ok`. Send the exact same request again: because the idempotency key matches, you get the same `runId` back instead of a second run. Then try a request with a wrong token and confirm it's rejected.

On the [Railway](https://railway.com?referralCode=kinney) template, run these through `railway ssh --service openclaw -- ...`. If you don't plan to use webhooks, set `hooks.enabled` back to `false` afterward.

### 5. If You Used TaskFlow Before

Run `openclaw doctor`. If it reports `plugin removed: webhooks`, run `openclaw doctor --fix` to clean up the old config. Then rebuild anything that relied on flows using the table at the top of this lesson.

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8`. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai).
