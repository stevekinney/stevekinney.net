---
title: Dynamic Workflows
description: 'A dynamic workflow moves the plan out of prose and into a script that runs subagents, so Claude only sees the final answer and not every report.'
---

The word "workflow" gets used for a lot of things. It can mean your team's process, a [skill](skills.md) that walks the agent through steps, or a CI pipeline. This lesson is about one specific meaning, so let's pin it down before it gets confusing.

A **dynamic workflow** is a JavaScript script that orchestrates many [subagents](subagents.md) (helper agents, each started with its own fresh context and a written brief, that return only a final report). Claude writes the script for your task. Then the workflow runtime, which is part of Claude Code itself, runs it in the background while your session stays responsive. Instead of representing the plan in words, you represent it in code.

To be clear, Claude still _writes_ the plan. What moves into code is _running_ it. The loops, the branches, and every intermediate result live in script variables, so Claude's [context](why-systems.md) (everything the model can see when it decides its next step) only gets the final answer, not every report along the way.

The control flow is ordinary code, so the order of steps is deterministic. The agents inside it aren't: each one is still a model, and its output can vary. OpenClaw's [Code Mode](https://docs.openclaw.ai/tools/code-mode) is a similar idea under a different name.

In practice, the script breaks a large task into bounded units of work with definite interfaces between each step. It can fan the work out in parallel or run it as a serial pipeline. In Claude Code, the `/workflows` view shows each phase of a run as a progress group.

Workflows are ephemeral by default. You can save a script and re-run it exactly as written, which [Running Workflows](running-workflows.md) covers. If you'd rather capture the _design_ and let Claude write a fresh script for each task, put it in a skill instead.

## The vocabulary

You'll hear these names constantly. They're mostly self-explanatory, but they give you the mental model.

- `meta`: A literal object that names and describes the workflow, and optionally lists its phases.
- `agent(prompt, opts?)`: Runs one subagent. Pass a `schema` (a description of the shape of the object you want back) and you get a validated object instead of prose.
- `pipeline(items, ...stages)`: Sends every item through every stage, each item moving at its own pace.
- `parallel(thunks)`: Runs a list of functions at the same time, and waits for all of them to finish before it returns.
- `phase(title)`: Starts a named progress group in the `/workflows` view, so you can see where the run is.
- `log(message)`: Records a progress message for the run.
- `workflow(nameOrRef, args?)`: Runs another saved workflow, by name or reference, and passes it arguments.
- `args`: The arguments the workflow was started with.
- `budget`: An object shaped like `{ total, spent(), remaining() }`. It tells the script how many tokens it has left, so the script can size its fan-out to fit.

## A tiny example

Here's the smallest useful one. The first agent lists API routes, the pipeline sends each route to its own reviewer, and the script returns the findings. The uppercase names (`ROUTES`, `FINDING`) stand for schemas. The examples leave their definitions out to stay short.

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

One gap: there's no handling of failure. `findings.length` counts failed items, so that log line can overstate how many routes were reviewed. If the first call fails, the next line throws. The section on the quiet `null` below explains why.

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
- A `schema` makes the subagent return a validated object, so you never hand-parse its output.
- `pipeline()` sends each item through every stage on its own. There's no barrier between stages.

## Pipeline versus parallel

`pipeline()` is the default, and it's usually what you want. Each item moves through the stages at its own pace, so the run takes as long as the slowest single item. A fast item never waits for a slow one.

`parallel()` is a barrier. It waits for every function in its list before it returns, so nothing after it starts until the slowest one finishes. Only reach for it when the next step genuinely needs every result at once, like deduplicating findings across all the reviewers.

## The quiet null

Here's the part that bites people. If a subagent can't produce a valid object after five attempts, that item quietly becomes `null`. The run doesn't error. It keeps going with a hole in its results.

Hold that thought. It's the reason [Running Workflows](running-workflows.md) spends a while on failure modes, and why a run that finished isn't the same as a run that worked.

A workflow is a good place to put a plan you trust. It's a bad place to hide one you haven't checked.
