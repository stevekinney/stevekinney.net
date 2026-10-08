---
title: Lobster Workflows
description: Run fixed, multi-step OpenClaw pipelines as a single tool call, with an approval pause before anything changes and a resume that picks up where it stopped.
---

When your agent does a multi-step job on its own, the model decides every step: call a tool, read the result, decide what's next, call another tool. That's flexible, but it's slow, it costs tokens on every round trip, and it may do things in a slightly different order each time.

**Lobster** is for jobs where you already know the steps. It runs a whole pipeline as **one tool call**, passes structured data from step to step, and **pauses for your approval** before any step that changes something. When you approve, it picks up where it stopped without re-running the earlier steps.

It's also where TaskFlow's job went. The old TaskFlow documentation now redirects to Lobster. See [Choosing an Orchestration Tool](choosing-an-orchestration-tool.md) for the full story.

## Install It

Lobster is an official plugin, but it doesn't ship with OpenClaw. Install it on the Gateway host:

```sh
openclaw plugins install @openclaw/lobster
openclaw plugins inspect lobster --runtime --json
```

A running Gateway picks up the plugin on its own. Plain `inspect` only checks the plugin's manifest and config, while `--runtime` actually loads it and confirms it registered the `lobster` tool.

Next, allow the tool. Lobster is an optional tool, so it isn't included unless you add it. Check what you already allow first, because setting the list replaces it:

```sh
openclaw config get tools.alsoAllow
openclaw config set tools.alsoAllow '["lobster"]'
```

If the first command printed entries (like `browser` from [the browser lesson](browser-setup-and-use.md)), include them in the new list. To allow Lobster for one agent only, set `agents.entries.<id>.tools.alsoAllow` instead.

> [!NOTE] Not available in sandboxed sessions
> The `lobster` tool is turned off entirely for sandboxed sessions. If you followed the sandboxing section of [Security and Approvals](security-and-approvals.md#layer-4-sandboxing), use Lobster from your main, unsandboxed session.

## Pipelines

The smallest Lobster program is a one-line pipeline. Steps are joined with `|`, and data flows between them as JSON, not text:

```text
exec --json --shell 'echo [3,1,2]' | sort
```

`exec --json` runs a shell command and parses its output as JSON. `sort` sorts it. The result is `[1, 2, 3]`.

Add `approve` and the pipeline pauses before going further:

```text
exec --json --shell 'echo [3,1,2]' | sort | approve --preview-from-stdin --limit 5 --prompt 'Keep going?'
```

Instead of finishing, the tool returns a status of `needs_approval`, the prompt, a preview of the data, and two ways to resume: a long `resumeToken` and a short `approvalId`.

## Workflow Files

Anything more than a few steps belongs in a workflow file. Here's one that cleans up `.tmp` files in a folder, but only after you've seen the list:

```yaml
name: tidy-scratch
args:
  dir:
    default: /tmp/lobster-lab
steps:
  - id: find
    command: find "$LOBSTER_ARG_DIR" -name '*.tmp' -type f
  - id: preview
    command: echo "Files to delete:" && cat
    stdin: $find.stdout
    condition: $find.stdout != ""
    approval: required
  - id: delete
    command: xargs rm -v
    stdin: $find.stdout
    condition: $preview.approved
```

What each part does:

- **`args`** are the workflow's inputs, with defaults. Each one is available to commands as an environment variable named `LOBSTER_ARG_<NAME>`, so `dir` becomes `LOBSTER_ARG_DIR`. All of them together are in `LOBSTER_ARGS_JSON`.
- **`command`** is a shell command run on the Gateway host.
- **`stdin: $find.stdout`** feeds one step's output into another. Use `$step.json` instead when a step prints JSON, and `$step.json.<field>` to pick out a field.
- **`condition`** decides whether a step runs. Here, `preview` is skipped when `find` found nothing, so you're never asked to approve an empty list.
- **`approval: required`** pauses the workflow after this step runs and shows its output as the preview.
- **`$preview.approved`** is only true once you've approved, so `delete` runs only after you say yes.

Workflow files use the `.lobster` extension (they're YAML), and `.yaml`, `.yml`, and `.json` work too.

> [!WARNING] The approval step itself runs before the pause
> `approval: required` means "pause _after_ this step," not "ask before running it." The step's own command runs first, so its output can be the preview. Make approval steps read-only, like the `echo` above, and put the real change in a later step gated on `$<step>.approved`. The example in OpenClaw's own docs puts `inbox apply --approve` on the approval step, which would run before you're asked.

## Running Lobster From Your Agent

You don't call Lobster directly. Your agent does, using the `lobster` tool:

| Parameter               | Default   | What it does                                                           |
| ----------------------- | --------- | ---------------------------------------------------------------------- |
| `action`                | —         | `run` or `resume`                                                      |
| `pipeline`              | —         | An inline pipeline, or the path to a workflow file                     |
| `argsJson`              | —         | Arguments for a workflow file, as a JSON string. Ignored for pipelines |
| `cwd`                   | Gateway's | A working directory, relative to the Gateway's own                     |
| `timeoutMs`             | `20000`   | How long the run may take                                              |
| `maxStdoutBytes`        | `512000`  | How much output a run may produce                                      |
| `token` or `approvalId` | —         | Which paused run to resume                                             |
| `approve`               | —         | `true` to continue, `false` to cancel                                  |

In practice, you ask in plain language: "Use the lobster tool to run `~/.openclaw/workspace/workflows/tidy-scratch.lobster`."

### How Approval Works

When a run pauses, the agent gets back the prompt, the preview, and the resume IDs, and it relays them to you in the conversation. You answer, and the agent calls `lobster` again with `action: "resume"`:

- **Approve**, and the run continues from the paused step. Earlier steps don't run again.
- **Deny**, and the run ends with a status of `cancelled`.
- **Either way, the resume ID is used up.** Trying it again fails because the saved state is gone.

The paused state is saved as small files in `~/.lobster/state` on the Gateway host. The token is just a pointer to those files, so don't clear that folder while something is waiting on you.

This isn't the same as an [exec approval](security-and-approvals.md#layer-3-exec-approvals). A Lobster pause doesn't produce an approval card in the Control UI or a push notification, and it doesn't show up in `openclaw approvals pending`. It only exists as the agent's message to you.

## What to Watch Out For

- **Steps run on the Gateway host with the Gateway's environment.** That includes any API keys in it. The docs don't say that Lobster's shell steps go through exec approvals, so treat a workflow file like a script you'd run yourself: only run ones you've read.
- **`openclaw.invoke` doesn't work reliably inside the plugin.** Lobster has a command for calling OpenClaw tools from a pipeline, but the embedded plugin doesn't pass along the Gateway's address or credentials. Until that's fixed, keep tool calls (including [LLM Task](llm-task.md)) outside your workflows and have the agent make them directly.
- **No automatic retries.** If a step fails after doing something, Lobster won't run it again, because it can't tell whether the side effect already happened.
- **Paths.** `cwd` must be a relative path inside the Gateway's working directory. A workflow file path can be absolute, which is the simplest option. Use absolute paths inside commands too, since you may not know the Gateway's working directory.
- **Timeouts.** The default is 20 seconds per run. Raise `timeoutMs` for anything slow.

## Try It Out

Run these against your real Gateway. On the Railway template, run the shell commands through `railway ssh --service openclaw -- ...`, and remember that `/tmp` there is inside the container.

### 1. Install and Smoke-Test

Install the plugin, allow the tool, and confirm it loaded with `openclaw plugins inspect lobster --runtime --json`. Then ask your agent:

> Use the lobster tool to run this pipeline and show me the raw result: `exec --json --shell 'echo [3,1,2]' | sort`

You should see a status of `ok` and an output of `[1, 2, 3]`. If the agent says it doesn't have a `lobster` tool, check `tools.alsoAllow` and send `/tools` to see what it can use.

### 2. Set Up a Lab

On the Gateway host, create some files to clean up:

```sh
mkdir -p /tmp/lobster-lab
touch /tmp/lobster-lab/a.tmp /tmp/lobster-lab/b.tmp /tmp/lobster-lab/keep.txt
```

Save the `tidy-scratch` workflow from above as `~/.openclaw/workspace/workflows/tidy-scratch.lobster`. You can also paste it to your agent and ask it to save the file there.

### 3. Approve a Run

Ask your agent:

> Use the lobster tool to run the workflow at `~/.openclaw/workspace/workflows/tidy-scratch.lobster`. If it pauses for approval, show me the preview and wait for my answer.

You should see a preview listing `a.tmp` and `b.tmp`, but not `keep.txt`. Reply that you approve. The agent resumes the run, and `ls /tmp/lobster-lab` should show only `keep.txt`.

### 4. Deny One, Then Try to Reuse It

Recreate the `.tmp` files and run the workflow again. This time, deny it. The run should come back `cancelled`, and the files should still be there. Then ask the agent to resume the same run again with approval. It should fail, because a resume ID only works once.

### 5. Pass Arguments, and Find Nothing

Create a second folder with one file, `/tmp/lobster-other/c.tmp`, and ask the agent to run the workflow with `argsJson` set to `{"dir":"/tmp/lobster-other"}`. The preview should list only `c.tmp`. Deny it.

Then run the workflow against `/tmp/lobster-lab` after it's been cleaned up. It should finish with `ok` and never ask you anything, because the `condition` skipped the preview step.

### 6. Put It on a Schedule

Create an automation that runs the workflow every evening and announces the result to Telegram:

```sh
openclaw automations create "0 21 * * *" \
  "Use the lobster tool to run ~/.openclaw/workspace/workflows/tidy-scratch.lobster. If it needs approval, tell me what it found and include the approval ID." \
  --name "Tidy scratch" --tz "America/Denver" --session isolated --announce
```

Use `openclaw automations run <job-id> --wait` to try it now instead of waiting. You should get a Telegram message with the preview and an approval ID. Reply in your main chat asking the agent to resume that approval ID. Then check whether the files are gone.

This is worth testing rather than assuming. The run that found the files is finished by the time you answer, so the resume happens in a different conversation. The saved state lives on the Gateway host, not in the conversation, so this should work, but confirm it on your setup before relying on it.

### 7. Find Out How Lobster Meets Your Exec Policy

If you set up `ask` mode in [Security and Approvals](security-and-approvals.md), run the workflow and watch for exec approval cards. The docs don't say whether Lobster's shell steps go through exec approvals. Note what you see. If no cards appear, Lobster steps run without that safety net, which is one more reason to only run workflow files you've read.

### Clean Up

Delete `/tmp/lobster-lab` and `/tmp/lobster-other`, and disable the automation with `openclaw automations disable <job-id>` if you don't want it.

## Troubleshooting

| Error                                    | What to do                                                          |
| ---------------------------------------- | ------------------------------------------------------------------- |
| The agent has no `lobster` tool          | Add it to `tools.alsoAllow`. Check that the session isn't sandboxed |
| `lobster runtime timed out`              | Raise `timeoutMs`, or split the work into smaller pipelines         |
| `lobster stdout exceeded maxStdoutBytes` | Raise `maxStdoutBytes`, or make the steps print less                |
| `run --args-json must be valid JSON`     | Fix the quoting in `argsJson`                                       |
| A resume fails with "not found"          | The run was already approved or denied, or its state was deleted    |
| `lobster runtime failed`                 | Check `openclaw logs` on the Gateway host                           |

> [!NOTE] Commands and flags change
> This lesson matches OpenClaw `2026.9.8` and the `@openclaw/lobster` plugin as of that release. If something doesn't behave as described, run the command with `--help` and check the [OpenClaw documentation](https://docs.openclaw.ai).
