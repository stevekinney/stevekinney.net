---
title: Dynamic Workflows
description: 'A dynamic workflow moves the plan out of prose and into a script that runs subagents, so Claude only sees the final answer and not every report.'
---

The word "workflow" gets used for a lot of things. It can mean your team's process, a [skill](skills.md) that walks the agent through steps, or a CI pipeline. Here it means one specific thing, so let's pin it down.

A **dynamic workflow** is a JavaScript script that orchestrates many [subagents](subagents.md)—helper agents that each start with a fresh context and a written brief and return only a final report. Claude writes the script for your task, and the workflow runtime built into Claude Code runs it in the background while your session stays responsive. Instead of representing the plan in words, you represent it in code.

Claude still _writes_ the plan. What moves into code is _running_ it. The loops, branches, and intermediate results live in script variables, so Claude's [context](why-systems.md)—everything the model can see when it picks its next step—gets only the final answer, not every report along the way.

The control flow is ordinary code, so step order is deterministic. The agents inside it aren't: each is still a model, and its output can vary. OpenClaw's [Code Mode](https://docs.openclaw.ai/tools/code-mode) is a similar idea under a different name.

The script breaks a large task into bounded units of work with definite interfaces between steps, then fans them out in parallel or runs them as a serial pipeline.

Workflows are ephemeral by default. You can save a script and re-run it exactly as written, which [Running Workflows](running-workflows.md) covers. If you'd rather capture the _design_ and let Claude write a fresh script for each task, put it in a skill instead.

## The vocabulary

These names come up constantly. They're mostly self-explanatory, and together they're the mental model.

- `meta`: A literal object that names and describes the workflow, and optionally lists its phases.
- `agent(prompt, opts?)`: Runs one subagent. Pass a `schema` (a description of the shape of the object you want back) and you get a validated object instead of prose.
- `pipeline(items, ...stages)`: Sends every item through every stage, each item moving at its own pace.
- `parallel(thunks)`: Runs a list of functions at once and waits for all of them before returning.
- `phase(title)`: Starts a named progress group in the `/workflows` view, so you can see where the run is.
- `log(message)`: Records a progress message for the run.
- `workflow(nameOrRef, args?)`: Runs another saved workflow, by name or reference, and passes it arguments.
- `args`: The arguments the workflow was started with.
- `budget`: An object shaped like `{ total, spent(), remaining() }` that tells the script how many tokens it has left, so it can size its fan-out to fit.

## A tiny example

Here's the smallest useful one. The first agent lists API routes, the pipeline sends each route to its own reviewer, and the script returns the findings. The uppercase names (`ROUTES`, `FINDING`) are schemas whose definitions I've left out to keep things short.

```js
export const meta = { name: 'route-audit', description: 'Audit routes' };

const routes = await agent('List API routes as JSON', { schema: ROUTES });

const findings = await pipeline(routes.items, (route) =>
  agent('Review authorization on ' + route.path, { schema: FINDING }),
);

log('Reviewed ' + findings.length + ' routes');
return findings;
```

Notice what _isn't_ here. There's no instruction telling Claude to remember each finding or keep count. The script holds all of that, and the `return` is the only thing Claude sees.

One gap: there's no failure handling. `findings.length` counts failed items, so the log line can overstate how many routes were reviewed, and if the first call fails, the next line throws. The section on errors and null results below explains why.

## A bigger example

This one has two phases. A scanning agent finds the flaky tests, and then one agent per test proposes a fix.

```js
export const meta = {
  name: 'find-flaky-tests',
  description: 'Find flaky tests, propose fixes',
  phases: [
    { title: 'Scan', detail: 'grep test logs' },
    { title: 'Fix', detail: 'one agent per test' },
  ],
};

phase('Scan');

const flaky = await agent('grep CI logs for retry markers', {
  schema: FLAKY_SCHEMA,
});

phase('Fix');

const fixes = await pipeline(flaky.tests, (t) =>
  agent(`Propose a fix for ${t.name}`, { schema: FIX_SCHEMA }),
);

return fixes;
```

A few details are doing real work in that script:

- `meta` is a pure literal. No variables, calls, spreads, or template interpolation. `name` and `description` are required.
- Every `phase()` title matches a `meta.phases` entry exactly. If it doesn't, it gets its own separate progress group.

## Pipeline versus parallel

`pipeline()` lets each item advance through its stages independently, with no barrier between stages. That doesn't mean every item gets a worker right away: agents beyond the concurrency limit queue for a slot. If the whole fan-out fits the available slots, the slowest item sets the runtime. Larger fan-outs also pay for queued waves of work. The [workflow limits](https://code.claude.com/docs/en/workflows#behavior-and-limits) default to at most 16 concurrent agents, sometimes fewer on CPU-limited systems.

`parallel()` is a barrier. It waits for every function in its list before it returns, so nothing after it starts until the slowest one finishes. Reach for it only when the next step needs every result at once, like deduplicating findings across all the reviewers.

The barrier's cost is easy to underestimate. Take three items and two stages, with enough agents to run them all at once and durations in minutes:

| Item | Stage 1 | Stage 2 | Its own path |
| ---- | ------- | ------- | ------------ |
| A    | 1       | 10      | 11           |
| B    | 1       | 1       | 2            |
| C    | 10      | 1       | 11           |

With a barrier between the stages, stage 2 can't start until C finishes stage 1, so the run takes 10 + 10 = 20 minutes. Pass each item along as soon as it's ready and the run takes as long as the slowest single path: 11 minutes. Same work, almost half the time, and the more the item durations vary, the bigger the gap. Calling `parallel()` once per stage, or `Promise.all` per stage in your own code, puts the barrier back. The [delegation economics experiment](/experiments/delegation-economics) lets you play with the numbers.

## Errors and null results

The [workflow documentation](https://code.claude.com/docs/en/workflows#what-the-saved-script-looks-like) distinguishes two failures. If structured output still fails schema validation after five attempts, `agent()` throws an error containing the last validation failure. Catch it and record a failed item, or let it stop the workflow—just don't count that item as reviewed.

If an agent is stopped mid-run or hits an unrecoverable API error, `agent()` resolves to `null` instead, and `pipeline()` keeps that entry in its results. Check for both exceptions and nulls before reporting success.

Hold that thought. It's the reason [Running Workflows](running-workflows.md) spends a while on failure modes, and why a run that finished isn't the same as a run that worked.

A workflow is a good place to put a plan you trust. It's a bad place to hide one you haven't checked.
