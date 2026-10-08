---
title: Swarms
description: Fan work out to many OpenClaw subagents from a short Code Mode script, collect structured results, and keep failures and costs in check.
---

[Subagents](subagents-and-orchestration.md) are good for handing off a few pieces of work. When you have many similar tasks, like reviewing twenty files, checking a dozen vendors, or summarizing every issue in a milestone, spawning children one at a time and waiting for each announcement gets clumsy. A **swarm** is OpenClaw's tool for that.

In a swarm, your agent writes a short JavaScript program that starts a batch of children, waits for them, and combines their results. The program is the plan: ordinary `Promise.allSettled`, `if`, and `while` decide what runs and in what order. There's no special workflow format.

The docs suggest a swarm once you have about **five or more** similar, independent tasks. For one or a few, a regular subagent is simpler.

## How Swarm Children Differ

Swarm children are called **collectors**. They're ordinary subagent sessions with a different way of finishing:

| Ordinary subagent                       | Swarm collector                                        |
| --------------------------------------- | ------------------------------------------------------ |
| Announces its result back to the parent | Saves its result for the script to collect             |
| Can be steered while it runs            | Can't be steered                                       |
| Waits for approval like any run         | **Never asks.** Anything that needs approval is denied |
| Returns text                            | Can return validated JSON when given a schema          |

That approval rule is the one to design around. A swarm is unattended by design, so give collectors read-only work. If a task needs a command that would normally ask you first, the collector reports the denial instead of waiting.

Everything from the subagents lesson about tool policy still applies. A collector of your main agent inherits its tools, minus the tools every subagent loses (like `message` and `cron`). To limit collectors further, run them as a [dedicated agent](#run-collectors-as-a-locked-down-agent).

## What You Need: Code Mode

Swarms are on by default. The friendly way to write one, the `agents.run()` function, needs **Code Mode** to be active for the run.

**Code Mode** is an experimental feature that changes how your agent uses tools. Instead of calling tools one at a time, the model writes a small JavaScript program that calls them as functions. That's what lets it start twenty children in one go.

Code Mode's default is `"auto"`, which turns it on only for models OpenClaw has marked as working well with it. That list includes recent Claude Opus and Sonnet models and recent GPT models, among others. It doesn't include smaller models like Haiku, local Ollama models, or custom endpoints.

You can't tell from your config whether it's actually on, so check a real run. This sends one message in a throwaway session, so it doesn't clutter your main conversation:

```sh
openclaw agent --agent main --session-key agent:main:code-mode-check \
  --message "Reply with OK." --json | grep codeModeEngaged
```

`"codeModeEngaged": true` means you're set. If it's `false`, you can turn Code Mode on:

- **In the Control UI:** **Settings → Agents & Tools → Labs → Code Mode**. It applies to the next run, with no restart.
- **For all agents:** `openclaw config set tools.codeMode true`
- **For one agent:** `openclaw config set agents.entries.main.tools.codeMode true`

`true` forces it on for every model, and `"auto"` returns to the default. If you ever write `tools.codeMode` as an object, include `enabled`. An object without `enabled` turns Code Mode **off**.

> [!NOTE] Code Mode changes how your agent works in general
> Code Mode affects every tool call, not just swarms, and it's still experimental. If your agent gets worse at everyday tasks after you force it on, turn it on for a separate agent instead and use that one for fan-out work.

> [!NOTE] On OpenAI models, check your runtime
> OpenAI models run through the Codex harness by default, which has its own Code Mode and never uses OpenClaw's. Swarms still work there, but tools are called as `tools.<name>` inside scripts and the setup differs. This lesson assumes OpenClaw's own runtime.

## Writing a Swarm

Once Code Mode is active, your agent has three extra functions:

```typescript
agents.run(prompt, options?)   // start one collector and wait for its result
phase(title)                   // label a stage, shown in the progress widget
log(message)                   // post a short progress note
```

`agents.run` takes these options: `label`, `model`, `thinking`, `fastMode`, `agentId`, `phase`, and `schema`. Without a `schema`, it resolves to the child's final text. With one, the child must submit an answer that matches it, and `agents.run` resolves to that value.

Here's what a typical script looks like. Your agent writes this; you don't have to:

```javascript
const reviewSchema = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    purpose: { type: 'string' },
    suggestion: { type: 'string' },
  },
  required: ['file', 'purpose', 'suggestion'],
  additionalProperties: false,
};

const files = ['AGENTS.md', 'SOUL.md', 'USER.md', 'TOOLS.md', 'MEMORY.md'];
phase('Review workspace files');

const settled = await Promise.allSettled(
  files.map((file) =>
    agents.run(`Read ${file} in the workspace. Say what it's for and suggest one improvement.`, {
      label: `review-${file}`,
      schema: reviewSchema,
    }),
  ),
);

const reviews = [];
const failures = [];
settled.forEach((outcome, index) => {
  if (outcome.status === 'fulfilled') reviews.push(outcome.value);
  else failures.push({ file: files[index], error: String(outcome.reason) });
});

log(`${reviews.length} reviews, ${failures.length} failures`);
return { reviews, failures };
```

A few patterns matter:

- **Use `Promise.allSettled`, not `Promise.all`.** With `all`, one failed child throws away every other result. With `allSettled`, you keep what succeeded and can report what didn't.
- **A failed child rejects with a `SwarmAgentError`.** It carries the child's `runId` and `status`. A child that returns JSON that doesn't match the schema counts as failed.
- **Bound your loops.** A `while` loop that keeps spawning children until something is "ready" should stop after a fixed number of passes. The group limits below are only a backstop.
- **Don't re-run on failure automatically.** Report the failures and let the agent, or you, decide.

In practice you won't write these scripts by hand. You describe the fan-out, say "use Swarm" or "use `agents.run`", and ask for a schema and `Promise.allSettled`. The agent writes the script.

## Limits

These live under `tools.swarm`:

| Setting                 | Default | What it limits                                        |
| ----------------------- | ------- | ----------------------------------------------------- |
| `maxConcurrent`         | `32`    | Children running at once. The rest wait in line       |
| `maxChildrenPerGroup`   | `50`    | Live children in one swarm                            |
| `maxTotalPerGroup`      | `200`   | Children one swarm may ever start                     |
| `waitTimeoutSecondsMax` | `600`   | The longest a single wait can last                    |
| `defaultAgentId`        | (empty) | Which agent collectors run as. Empty means your agent |
| `enabled`               | `true`  | Set `false` to turn swarms off                        |

Swarm children don't count against the ordinary subagent limits (`maxConcurrent: 8` and `maxChildrenPerAgent: 5`), but `maxSpawnDepth` still applies.

**Cost scales with the batch.** Each running child is its own model conversation. Twenty children cost roughly twenty times as much as one. For cheap fan-out work, pass a cheaper `model` to `agents.run` or run collectors as an agent with a cheaper default model.

## Run Collectors as a Locked-Down Agent

`defaultAgentId` sends every collector to a different agent unless the script says otherwise. Point it at the read-only `researcher` from [the subagents lesson](subagents-and-orchestration.md#lever-2-a-dedicated-agent-for-risky-work), and every child gets that agent's narrow tool policy, model, and workspace:

```sh
openclaw config set tools.swarm.defaultAgentId researcher
openclaw config set agents.entries.researcher.tools.swarm false
```

The second line stops the researcher from starting swarms of its own. The target agent must be in your main agent's `subagents.allowAgents`, which it already is if you followed that lesson. If it isn't, spawns are rejected instead of falling back to your main agent.

## Watching and Stopping

Keep the conversation open in the **Control UI** (or the macOS, iOS, or Android app) while a swarm runs. A progress widget appears above the message box with queued, running, completed, and failed-or-stopped counts. Click **Child details** to see each child and how long it took. Collectors also have their own transcripts, but they don't get rows in the session sidebar.

Telegram and other chat apps don't show the widget. If you started the swarm there, open the same session in the Control UI to watch it.

To stop a swarm, click **Stop** in the parent conversation. That cancels the swarm's children and anything they started. Like other subagents, collectors that have already started **keep running** if the parent simply finishes or times out, so stop them explicitly.

If the Gateway restarts mid-swarm, interrupted children aren't relaunched, and the script itself doesn't resume. Look at what finished before asking for the rest again.

## Without Code Mode

If you can't or don't want to turn on Code Mode, the same machinery is available as plain tools. Your agent calls `sessions_spawn` with `collect: true` (and an `outputSchema` for JSON results), then calls `agents_wait` with the run IDs to collect the results. Both tools must be allowed by your tool policy. It's clunkier, since the model makes one tool call per child, but it works with any model.

## Try It Out

### 1. Check Whether Code Mode Is Active

Run the `codeModeEngaged` check from above. If it says `false`, turn on Code Mode with the Labs switch or `openclaw config set tools.codeMode true`, and check again.

### 2. Run Your First Swarm

Ask your agent:

> Use Swarm. Write a Code Mode script that calls `agents.run` once for each of these workspace files: AGENTS.md, SOUL.md, USER.md, TOOLS.md, and MEMORY.md. Each child reads its file and returns `{ file, purpose, suggestion }` using a schema. Use `Promise.allSettled`. Then give me a table of the results and list any failures.

Open the conversation in the Control UI and watch the widget while it runs. When it's done, you should have one row per file, with a suggestion for each. The suggestions themselves are useful; consider acting on one.

### 3. Make One Child Fail

Run it again with a sixth file that doesn't exist, like `NOPE.md`. You should get five results and one reported failure. Then ask for the same swarm using `Promise.all` instead. This time the whole run should fail, and the five good results are lost. That's why scripts should use `allSettled`.

### 4. Confirm Collectors Never Ask

If your exec policy asks before running commands (see [Security and Approvals](security-and-approvals.md)), ask for a five-child swarm in which each child runs `uname -a` and reports the output. No approval card should appear. Each child should report that the command was denied. Compare that with asking your main agent to run `uname -a` directly, which does ask you first.

### 5. Route Collectors to the Researcher

Set `tools.swarm.defaultAgentId` to `researcher` as shown above, and run the five-file review again. Look closely at the answers: they now describe the researcher's workspace, not your main agent's, because every agent has its own. Some files may be missing there. Then ask for a swarm in which each child tries to run `ls ~`. Every child should report that it can't run commands, because the researcher has no shell. When you're done, remove the setting:

```sh
openclaw config unset tools.swarm.defaultAgentId
```

### 6. Stop One Partway Through

Ask for a swarm of ten children that each research a different topic in depth, so they take a while. While the widget shows children running, click **Stop**. The counts should move to failed-or-stopped, and the agent should report only partial results.

### 7. Decide What to Keep

If you forced Code Mode on just for these exercises, decide whether to keep it. Use your agent normally for a day. If it seems worse at ordinary tasks, set `tools.codeMode` back to `"auto"`, or turn it on only for a dedicated fan-out agent.

## Troubleshooting

| Symptom                                             | Check                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The agent says `agents.run` isn't available         | Whether Code Mode is engaged (`codeModeEngaged`), and that `tools.swarm` isn't `false` |
| `codeModeEngaged` is `false` even with Code Mode on | Your model runs on a harness with its own tools, such as Codex for OpenAI models       |
| Code Mode is set but turned itself off              | A `tools.codeMode` object without `enabled` means off                                  |
| A child "failed" but its answer looks fine          | Its JSON didn't match the schema. Check the error for `schemaError`                    |
| Spawns to another agent are rejected                | That agent must be in your agent's `subagents.allowAgents`                             |
| A spawn fails with a config key in the message      | The swarm hit `maxChildrenPerGroup` or `maxTotalPerGroup`                              |
| Every child reports a denied command                | Collectors never ask for approval. Make the task read-only or run it outside the swarm |

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8`. Code Mode is experimental, so expect it to change. If something doesn't behave as described, check the [OpenClaw documentation](https://docs.openclaw.ai).
