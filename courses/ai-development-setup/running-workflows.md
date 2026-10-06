---
title: Running Workflows
description: 'When a dynamic workflow earns its cost, what it can and cannot do, and the two ways a green run hides failure: dropped nulls and double-writing resumes.'
---

[Dynamic workflows](dynamic-workflows.md) are easy to start and easy to regret. A script that fans out to a hundred agents will happily spend a big chunk of your usage before you've finished your coffee. So know when the work justifies one.

## When to use one, and when to skip it

Consider a workflow when:

- You want to cover a large surface in parallel.
- You want adversarial checks: a second agent trying to knock down a finding before you accept it.

Skip it when:

- You're just making one edit.
- Nothing can run in parallel.
- The plan may change mid-run. (Not yet knowing the _list_ of work is different. See the table below.)
- You need planned human sign-off between phases. Tool permission prompts are supported, but arbitrary mid-run questions aren't.
- Several agents would share ownership of the same files. Give each its own [worktree](worktrees.md), an extra checkout of the repository with its own files and branch.
- The script would have to make the important decisions. Merges and writes to outside systems belong to the main session (the agent coordinating the work) or to you.
- Verifying the fan-out would cost more than the fan-out itself.

## Limits

- **Concurrency**: 16 agents at once by default, adjustable from 1 to 256 if you _really_ hate your usage limit. (Subscriptions meter usage in five-hour windows, and API billing charges per token. A big fan-out drains either.)
- **Items per call**: 4,096 per `pipeline()` or `parallel()` call. Items beyond the concurrency cap queue for a free slot.
- **Agents per run**: 1,000 in total, and you get a warning after about 25 agents or 1.5 million projected tokens.

The limits stack. A call can stay under 4,096 items and still hit the 1,000-agent cap.

## Resuming a run

Pausing a live run in `/workflows` and pressing `p` again picks up where it paused. Nothing replays. Relaunching a stopped run or an edited script is different: Claude Code replays from the top, returning saved results for unchanged successful calls until the first changed or failed call. Everything after that runs live. The [resume reference](https://code.claude.com/docs/en/workflows#resume-after-a-pause) distinguishes these paths.

## What doesn't work in a script

A workflow script is JavaScript, not TypeScript, and it runs in a restricted environment. These are out:

- Type annotations.
- `Date.now()`, `Math.random()`, and `new Date()` with no arguments. They throw, because a replay has to make the same decisions as the original run.
- The filesystem, the shell, and other Node APIs.
- `import()`.
- Variables, calls, spreads, or interpolation inside `meta`.

## Kicking one off

Four ways to start one:

- Say "use a workflow."
- Include the `ultracode` keyword in a prompt you typed.
- Run `/effort ultracode`, a session setting that makes Claude plan a workflow for every substantial task.
- Run a saved `/<name>` command.

The keyword only counts when a _person_ typed it. It's ignored in `claude -p` (print mode, one non-interactive run), in [desktop scheduled tasks and cloud routines](routines-and-schedules.md), and in webhooks. And `workflowSizeGuideline`, a setting that tells Claude roughly how many agents to aim for, is only advice.

The `/workflows` view lists your runs. Press `s` on one to save its script as a `/<name>` command, in `.claude/workflows/` for the project or `~/.claude/workflows/` for you personally.

## Models and cost

Each agent's model comes from the first match in this order:

1. The `model` on the `agent()` call.
2. The `model:` in the agent's definition, which only applies when you run one of your own [subagent definitions](subagent-configuration.md) with `agentType`. The default workflow agent has none.
3. The `CLAUDE_CODE_SUBAGENT_MODEL` environment variable.
4. Your session's model.

Leave the first and third unset and use the default agent, and an Opus session runs _every_ agent on Opus. Field reports put runs at hundreds of thousands to millions of tokens, so don't discover that on your invoice. [Prompt Caching and Cost](caching-and-cost.md) covers what drives the number.

## What a workflow agent can and can't do

A workflow agent can:

- Read, edit, and run commands with its own tools.
- Work in its own checkout with `isolation: worktree`.
- Message other agents, when its tools include `SendMessage`.
- Return a schema-validated object to the script.
- Run as one of your own agent definitions via `agentType`, so its model, tools list, and [hooks](hooks.md) (scripts the harness runs at lifecycle events) all apply.

It can't:

- See your conversation or the skills you invoked.
- Ask you a question. The `AskUserQuestion` tool is removed from every subagent.
- Launch another workflow. The `Workflow` tool is removed too.
- Request arbitrary human sign-off between stages. Split those stages into separate runs.

The run does pause when an agent's tool call needs permission, and eligible interactive runs can wait for usage limits to reset. Those are the [automatic pause cases](https://code.claude.com/docs/en/workflows#behavior-and-limits), and neither gives you a scripted sign-off step. Keep human decisions between stages outside the script.

## Failure modes

- **Runaway fan-out**: Nothing stops a script from queuing hundreds of agents, all on your session's model. The concurrency cap limits how many run at once, not how many run in total.
- **Believing an agent's summary**: "Success" is a claim, not evidence. [Verification and Evidence](verification-and-evidence.md) is the whole argument.
- **Silently dropping partial results**: See the `.filter(Boolean)` caveat below.
- **Resuming into duplicate side effects**: See resume's sharp edge below.

### The `.filter(Boolean)` caveat

A stopped subagent or an unrecoverable API error produces `null`, and the pipeline keeps it in its results. Exhausting the five structured-output validation attempts throws instead, with the last validation failure. The [workflow reference](https://code.claude.com/docs/en/workflows#what-the-saved-script-looks-like) says to handle these separately: catch validation errors to record failures and keep going, and count null results before reporting success.

Writing `.filter(Boolean)` deletes those entries, so the run looks clean. That's fine when losing one item doesn't change the result, like one of several independent reviewers. It's a failure when the missing item was the one thing you needed. Count how many items the filter removed, and report it.

### Resume's sharp edge

When you relaunch a stopped or edited run, everything from the first changed or failed step reruns. If those steps write to outside systems, they can write twice. Use idempotency keys (IDs that make a repeated write harmless) or move the write outside the workflow.

You don't type the relaunch yourself. Ask Claude, and it calls the `Workflow` tool with `{ scriptPath, resumeFromRunId }`, using the run ID from the original tool result. And check `journal.jsonl`, the file in the run's transcript directory that records what each agent actually returned, before you trust an empty-looking result.

## What to use when

"Direct agent dispatch" means Claude starts subagents itself, turn by turn, with no script.

| You have                                                       | Use                                                         |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| Three to five independent investigations                       | [Subagents](subagents.md) in the background                 |
| Dozens to hundreds of agents, or an orchestration you'll rerun | A workflow                                                  |
| A known fan-out you want deterministic and resumable           | A workflow                                                  |
| A graph with no real parallelism and a plan that _may_ change  | Direct agent dispatch                                       |
| Planned human sign-off, or a stop-and-verify handshake         | Direct agent dispatch                                       |
| A list of work you haven't discovered yet                      | Scout inline first, then pipeline over what you found       |
| You want to steer each step yourself                           | A [skill](skills.md)                                        |
| Five to thirty worktree pull requests                          | `/batch`, which fans a change out as worktree pull requests |
| Workers that need to argue with each other                     | An [agent team](agent-teams.md)                             |

> [!NOTE] Codex has no script-driven equivalent
> You can build one yourself: a script that runs `codex exec --output-schema` workers. `codex exec` is [Codex's non-interactive mode](https://developers.openai.com/codex/noninteractive).

Use a workflow when the parallel work is real, the plan is stable, and the gates can stay outside the script. If any of them is shaky, dispatch the agents yourself.
