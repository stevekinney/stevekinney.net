---
title: The Anatomy of an Agent Loop
description: >-
  Every major AI agent runs the same core loop. The 6-line version is easy. The
  production-hardened version—with context compaction, loop detection, cost
  budgets, and graceful termination—is where things get interesting.
date: 2026-03-19
modified: 2026-03-20
tags:
  - ai
  - agents
  - tooling
---

Every agent framework I've looked at—Claude Code, Codex, Cursor, the Vercel AI SDK, LangGraph, smolagents—converges on the same architecture. Not similar. The _same_. A while loop that calls an LLM, checks if the response contains tool calls, executes them if it does, and stops if it doesn't. That's the whole thing.

I spent an unreasonable amount of time reading through the source code of these frameworks expecting to find meaningfully different approaches. Some secret sauce. What I found instead was the same six lines of logic wearing different costumes. The loop is a solved problem. The engineering _around_ the loop—context management, safety controls, graceful degradation, cost containment—is where all the interesting decisions live. And that's what this post is actually about.

## The loop every framework converges on

Here's the canonical agent loop. Every framework implements some version of this:

```typescript
while (!done) {
  const response = await callLLM(messages);
  if (response.toolCalls.length > 0) {
    const results = await executeTools(response.toolCalls);
    messages.push(...results);
  } else {
    done = true;
    return response;
  }
}
```

That's it. But if you haven't worked with tool calling before, the pseudocode above might raise a question: what does "response has tool_calls" actually mean?

When you send a message to an LLM through its API, you can also pass a list of **tools**—functions the model is allowed to call. Each tool has a name, a description, and a schema for its parameters. If the model decides it needs to use one, it doesn't return plain text. Instead, it returns a structured object that says "call this function with these arguments." Your code executes the function, sends the result back as a new message, and the model continues from there. So when you ask a model "what's the weather in Chicago?" and it has access to a `get_weather` tool, it doesn't guess—it emits a tool call like `get_weather(city="Chicago")`, your code runs it, and the model uses the actual result to form its answer.

That's the whole mechanism. Tool calls are the continuation signal—they mean "I'm not done yet, I need more information or I need to take an action." A text-only response is the termination signal—it means "I have what I need to answer." (If you want to see what this looks like as real, runnable code, the [building one from scratch](#building-one-from-scratch) section later in this post walks through it step by step.)

[Barry Zhang](https://www.youtube.com/watch?v=D7_ipDqhtwk) boiled it down even further: `env = Environment(); while True: action = llm.run(system_prompt + env.state); env.state = tools.run(action)`. Two lines if you squint. The environment mutates, the model observes, the model acts, repeat. Everything else is orchestration.

This pattern has a name. The [ReAct paper](https://arxiv.org/abs/2210.03629) from Yao et al. (Princeton and Google Research, 2022) formalized the idea of interleaving **reasoning** and **acting**—letting the model think about what to do, do it, observe the result, and think again. It showed a 34% improvement on ALFWorld benchmarks compared to chain-of-thought alone. The insight wasn't complicated: models that can _do things_ and _see what happened_ perform better than models that just think really hard.

What makes this pattern so sticky is its elegance. There's no scheduler, no state machine, no message bus. The LLM decides what to do next. Tools are the only way it can affect the world. And the loop runs until the model decides it's done. Anthropic's [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) draws a useful distinction here: this is an **agent**, not a **workflow**. Workflows are predetermined sequences where you, the developer, define the control flow. Agents are open-ended loops where the _model_ decides the control flow. The while loop is the minimum viable agent because it hands the steering wheel to the LLM and gets out of the way.

## How the frameworks actually implement it

The six-line version is instructive, but the real implementations reveal where each framework's philosophy shows up. I dug through the source code of six frameworks, and the contrasts are genuinely interesting.

### OpenAI Agents SDK

The OpenAI Agents SDK ([Python](https://github.com/openai/openai-agents-python), [TypeScript](https://github.com/openai/openai-agents-js)) evolved from the earlier "Swarm" prototype and has the cleanest architecture for teaching purposes. The core loop is a `while (true)` that calls `runSingleTurn()` on each iteration.

What makes it interesting is the discriminated union that classifies each turn's outcome:

```typescript
type NextStep =
  | { type: 'final_output' } // LLM produced a typed response, no tool calls → stop
  | { type: 'handoff' } // LLM invoked a handoff tool → swap agent, continue
  | { type: 'run_again' } // Tool calls present → execute tools, continue
  | { type: 'interruption' }; // Tool needs human approval → pause, return partial
```

Four branches. That's the entire decision tree. Every possible thing that can happen after an LLM call maps to one of these. The default `max_turns` is 10, and a "turn" is one LLM invocation—tool execution doesn't increment the counter.

The handoff mechanism is particularly clever: agent-to-agent delegation is implemented as a specialized tool call named `transfer_to_<agent_name>`. It reuses the existing tool infrastructure rather than inventing a separate routing layer. There's also an `agent.as_tool()` pattern for centralized orchestration, where one agent calls another like any other tool.

Guardrails run at three points: **input** (first turn only, in parallel with the first LLM call as a latency optimization), **output** (after the final response), and **tool** (before and after each tool execution). Each returns a `tripwire_triggered` boolean. It's a clean design—guardrails are filters on the loop, not part of the loop itself.

### Claude Agent SDK

The [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) takes a fundamentally different approach. The agent loop doesn't run in your application process at all. It runs inside a bundled Claude Code CLI binary. Your application communicates with it over stdin/stdout using NDJSON:

```text
Your App --stdin (NDJSON)--> Claude Code CLI --HTTP--> Anthropic API
```

This is a _philosophical_ difference, not just an implementation detail. The loop, the tool execution, the context management—all of it happens in a subprocess you don't control directly. You send a prompt in, you get structured messages back. Three streaming granularities: final results only, progress updates, or live token streaming.

The permission system is where this architecture earns its complexity. Three layers: `allowed_tools` (auto-approve), `disallowed_tools` (block, overrides allow), and `permission_mode` (fallback for everything else). You can scope permissions down to individual command patterns like `"Bash(npm:*)"`. When the agent hits a permission denial, it receives the rejection as a tool result and attempts an alternate approach—it self-heals from access restrictions.

Context management is automatic. The SDK compacts when approaching the context limit, emitting a `SystemMessage(subtype="compact_boundary")` so you know it happened. Instructions that need to survive compaction go in `CLAUDE.md` files, which get re-injected every request. Sub-agents (via the `Task` tool) spin up with fresh context windows and return condensed summaries—typically 1,000 to 2,000 tokens from 10,000+ tokens of internal work.

Every `ResultMessage` includes `total_cost_usd`, token usage, `num_turns`, and a `session_id`. Runs are resumable by design.

### smolagents

HuggingFace's [smolagents](https://github.com/huggingface/smolagents) is about 1,000 lines of code and makes one big bet that sets it apart: **code-as-action** instead of JSON tool calls.

The thesis is blunt: "Code languages were specifically crafted to be the best possible way to express actions performed by a computer. If JSON snippets were a better expression, JSON would be the top programming language and programming would be hell on earth."

The `CodeAgent` generates Python snippets instead of structured JSON. Research backing it (["Executable Code Actions Elicit Better LLM Agents"](https://arxiv.org/abs/2402.01030)) shows roughly 30% fewer steps compared to JSON tool calls. That's not a marginal improvement—it means agents finish tasks faster and consume fewer tokens doing it.

The loop accumulates typed steps—`SystemPromptStep`, `TaskStep`, `ActionStep`, `PlanningStep`—into an `AgentMemory`. Termination happens when the generated code calls `final_answer()`, which raises a `FinalAnswerException`. If the agent hits `max_steps` without calling `final_answer()`, it doesn't just silently stop—it synthesizes a response from its history. That graceful degradation is a detail most frameworks get wrong.

One thing I found genuinely interesting: smolagents has built-in planning steps at configurable intervals. The agent periodically pauses to plan before acting. An analysis of 15,724 traces showed that first-call parsing errors dropped success rates from 51.3% to 42.3%, which led to a structured `CodeAgent` variant that uses JSON schema with `"thoughts"` and `"code"` fields for 100% parsing reliability.

### Vercel AI SDK

The [Vercel AI SDK](https://ai-sdk.dev/docs/agents/building-agents) is TypeScript-first and designed for web developers. The architecture is composable in a way that feels natural if you're used to building with middleware patterns.

A minimal agent looks something like this:

```typescript
const agent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4.5',
  instructions: 'You are a helpful assistant.',
  tools: {
    weather: tool({
      description: '...',
      inputSchema: z.object({ city: z.string() }),
      execute: async ({ city }) => getWeather(city),
    }),
  },
  stopWhen: stepCountIs(20),
});
```

The interesting design choice: `Agent` is an _interface_, not a class. Third parties can implement it—Temporal built a `DurableAgent` on top of it for workflows that need to survive process restarts.

The default stop condition is `stepCountIs(1)`, which means no looping at all. You have to explicitly opt in. Stop conditions are composable: `stopWhen: [stepCountIs(20), yourCustomCondition()]`. The `prepareStep` hook runs before each LLM call and can dynamically change the model, tools, messages, or tool choice per-step. That's a level of per-iteration control I haven't seen in other frameworks.

There's also a "done tool" pattern worth knowing: force `toolChoice: 'required'` and define a tool without an `execute` function. When the model calls it, the loop halts—you've essentially created a structured output termination signal.

### LangGraph

[LangGraph](https://github.com/langchain-ai/langgraph) replaces the while loop with a **directed cyclic graph**. Not a DAG—cycles are the whole point.

Three primitives: **State** (a TypedDict or Pydantic model), **Nodes** (Python functions that transform state), and **Edges** (routing functions that decide what runs next). The "loop" is a cycle: an `llm_call` node connects to a conditional edge (`should_continue`) that routes to either a `tool_node` or `END`.

The execution model borrows from Google's Pregel: **supersteps** where all scheduled nodes run in parallel per tick, state gets merged, and a checkpoint gets written. That checkpointing at every node transition is the killer feature. You get `InMemorySaver`, `SqliteSaver`, `PostgresSaver`, and community implementations for Redis and Couchbase.

This enables things the while-loop pattern can't do easily: parallel branch execution, fault tolerance, interrupt/resume, human-in-the-loop approval, and time travel (load a prior checkpoint, modify state, fork execution from that point). The rationale is honest: LLM calls are high-latency and non-deterministic. Retrying a failed 30-second agent run from scratch is expensive. Being able to resume from the last successful checkpoint is a _real_ production advantage.

The trade-off is complexity. If your agent is a straightforward loop with tools, LangGraph is overkill. If you need durable, resumable, parallelizable agent workflows—honestly, it might be the right tool.

### The others

**CrewAI** does deterministic orchestration (Flows with `@start()` and `@listen()` decorators) plus autonomous reasoning (Crews), with a ReAct loop inside `CrewAgentExecutor._invoke_loop()`. **AutoGen** models everything as inter-agent conversation—the loop is message exchange between agents. Its v0.4 adopts an actor model, and its Magentic-One variant uses a dual-loop ledger planning system. Both are worth knowing about; neither introduced patterns I hadn't seen in the other four.

## What matters in production

The loop is the easy part. The hard part is everything that keeps the loop from going off the rails when real users are involved.

### Single-agent versus multi-agent

Anthropic published internal data on token scaling that I think about constantly: a standard chat interaction costs **1x** tokens, a single-agent loop costs roughly **4x**, and a multi-agent system costs approximately **15x**. That 15x is not a typo. Every handoff between agents means context gets duplicated, summarized, or re-established—and each of those operations burns tokens.

Multi-agent outperformed single-agent by 90.2% on Anthropic's internal evaluations, so the capability improvement is real. But you're paying for it. The question is whether the task complexity justifies the cost.

Four multi-agent patterns show up in practice:

**Pipeline:** Agents run in sequence, each passing output to the next. Simple, predictable, but no parallelism. Good for staged workflows like "research → draft → review."

**Manager:** One orchestrator agent delegates to specialists and synthesizes their outputs. Clean separation of concerns. The manager becomes a bottleneck if it makes poor routing decisions.

**Handoffs:** Agents transfer control to each other directly—the OpenAI Agents SDK's `transfer_to_<agent_name>` pattern. Decentralized, flexible, but harder to debug because there's no single point of control.

**Fan-out:** Multiple agents work in parallel on independent sub-tasks, results are merged. Best throughput, but requires tasks that are genuinely decomposable.

I mean, for most tasks I've seen in practice, a single agent with good tools handles it fine. Multi-agent is the right call when you need genuine specialization—when different parts of the task require fundamentally different system prompts, tool sets, or models. If you're reaching for multi-agent because single-agent "feels too simple," you're probably about to spend 15x the tokens for marginal improvement.

### Context engineering

This is the new frontier. Not prompt engineering—**context engineering**. What the model sees at each iteration of the loop matters more than what you told it at the start.

Anthropic's [context engineering guide](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) frames it as four strategies:

**Write context:** Save information outside the context window. Scratchpads, memory files, progress notes. The model generates information it'll need later and persists it to a tool-accessible location so it survives compaction.

**Select context:** Pull relevant information in at the right time via tools—grep, glob, RAG, database queries. The model doesn't need to carry everything in its window; it needs to _find_ everything when it needs it.

**Compress context:** Reduce token count without losing critical information. Claude Code auto-compacts after 95% usage. Tool result clearing—replacing old tool outputs with summaries—is "the safest, lightest-touch form of compaction."

**Isolate context:** Sub-agents with fresh context windows tackle sub-tasks and return condensed summaries. A sub-agent might use 10,000+ tokens internally but return a 1,000-token summary to the parent.

The [Manus team's findings](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus) are the most revealing production data I've seen on this. They measured their token distribution: tool responses account for **67.6%** of total tokens, while the system prompt is only 3.4%. "Tools comprise nearly 80% of what the agent actually sees." The takeaway: optimizing your system prompt is practically irrelevant compared to optimizing your tool responses.

Their single most important metric? **KV-cache hit rate.** Cached tokens cost $0.30 per million versus $3 per million uncached—a 10x difference. They never dynamically add or remove tools mid-iteration because it invalidates the cache. They use logit masking instead to control which tools are available, preserving the prefix cache across turns.

Two Manus patterns stuck with me. First: agents maintain `todo.md` files to "recite objectives into the end of context." This combats the lost-in-the-middle problem—by the time an agent is 15 turns deep, it's easy for the original goal to drift out of attention. Second: "Erasing failure removes evidence." They keep failed actions visible in the context because the model needs to see what _didn't_ work to avoid repeating it.

They rebuilt their framework four times. They call their optimization process "Stochastic Graduate Descent." (I appreciate the honesty.)

### Tool design

Anthropic's [tool design guidance](https://www.anthropic.com/engineering/writing-tools-for-agents) here is surprisingly opinionated: "Few thoughtful tools targeting specific high-impact workflows." Not a giant catalog. Not a tool for every API endpoint. Fewer, better tools.

The litmus test they propose: "If a human engineer can't definitively say which tool should be used in a given situation, an AI agent can't be expected to do better." If your tools overlap—if `read_logs` and `search_logs` and `get_log_entries` all exist and a human would have to think about which one to use—the model will get confused too.

Instead of `list_users` + `list_events` + `create_event`, build `schedule_event`. Instead of `read_logs`, build `search_logs` with filtering and context built in. Higher-level, task-oriented tools outperform granular CRUD tools because they reduce the number of decisions the model has to make per task.

A few practical details that matter:

**Object dispatch, not if/else chains.** `Object.fromEntries(tools.map(t => [t.name, t]))` for lookup. Clean, extensible, O(1).

**Tools return error strings, not exceptions.** When a tool fails, the model needs to see the error as text in its context so it can reason about what went wrong. Exceptions break the loop; error strings let the model self-correct.

**Poka-yoke your tool interfaces.** Anthropic found that requiring absolute file paths eliminated an entire class of model errors on SWE-bench. They spent more time optimizing tool design than the overall prompt.

**Namespace when you integrate.** `asana_projects_search`, `jira_search`—prefixed tool names prevent collisions and make the model's tool selection more reliable. Fifteen well-defined, distinct tools can work; fewer than ten overlapping ones fail.

## Building one from scratch

Reading about frameworks is useful. Building a minimal agent yourself is more useful. Here's what that looks like, progressively.

### The minimal viable agent

A working agent in about 30 lines, using the OpenAI-compatible API shape (adapted from [Victor Dibia's walkthrough](https://victordibia.com/blog/agent-execution-loop/)):

```typescript
async function run(task: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: instructions },
    { role: 'user', content: task },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: toolSchemas,
    });

    const message = response.choices[0].message;
    messages.push(message); // [!note MUST append before tool results]

    if (!message.tool_calls?.length) {
      return message.content ?? '';
    }

    for (const toolCall of message.tool_calls) {
      const result = executeTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: String(result),
      });
    }
  }
}
```

The annotated line is the most common beginner mistake. You _must_ append the assistant's message (the one containing `tool_calls`) to the history before appending tool results. The API requires tool result messages to reference existing `tool_call_id`s in the conversation. Swap the order and you get a cryptic validation error that doesn't obviously point to the problem.

The Anthropic shape is slightly different—tool results go in a `{ role: 'user', content: toolResults }` message, and you check `response.stop_reason === 'end_turn'` instead of checking for empty tool calls—but the loop structure is identical.

For the Anthropic API, a minimal version might look something like this:

```typescript
async function agentLoop(messages: MessageParam[]) {
  while (true) {
    const response = await client.messages.create({
      model: MODEL,
      system: SYSTEM,
      messages,
      tools: TOOLS,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      return response;
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        const result = dispatch[block.name](block.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: String(result),
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }
}
```

How simple can you go? The [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent) is about 100 lines of Python. It gives the model a single tool—bash—and uses regex to parse actions from the model's output. No structured tool calling, no JSON schemas, just a regex that pulls commands out of fenced code blocks. The team that built the full SWE-agent spent over a year on it and was "stunned" that stripping it to 100 lines still achieved 74-76.8% on [SWE-bench Verified](https://www.swebench.com), depending on the model. For context, the state of the art is around 80.9%. A hundred lines gets you 95% of the way there.

### Adding streaming

For interactive use, you want streaming. The model sends tokens as they're generated, and tool calls stream incrementally. The implementation depends on your transport, but the key detail for HTTP is the `X-Accel-Buffering: no` header if you're behind nginx. Without it, nginx buffers your SSE stream and the client gets nothing until the response completes—which defeats the entire purpose.

### Safety controls

This is the meatiest section because it's where most production agents actually fail. You need defense in depth—not one termination mechanism, but several overlapping ones.

**Max iterations** is the single most important safety control. Set a hard cap on how many times the loop can run. Typical production values are 15 to 25 steps. When you hit the cap, don't just stop silently—use the **early stopping generate** pattern: append a message like "You've reached the maximum number of steps. Provide your best answer now based on the work you've done so far." and call the LLM one more time _without tools_. This gives the model a chance to synthesize whatever it's gathered rather than leaving the user with nothing.

**Wall-clock timeout** catches cases where individual steps are slow. A 300-second cap is reasonable for most tasks. This protects against tools that hang, network issues, or models that generate extremely long responses.

**Token and cost budgets** set a hard ceiling on spend. Something like $2.00 per run. Monitor whether your token consumption is growing linearly (expected—each turn adds a roughly constant amount) or quadratically (the full conversation gets re-sent each turn without compaction—this will blow your budget fast).

**Loop detection via fingerprinting** catches the subtle case where the agent is _running_ but not _progressing_. Hash each iteration's `(tool_name, result_preview)` tuple. If you see three identical fingerprints in a row, the agent is stuck. One production system saw the same answer repeated 58 times before anyone intervened. Don't be that system.

**Error classification** determines whether to retry or bail. HTTP status codes are your friend: 429, 500, 502, 503, 504 are retryable—use exponential backoff with jitter. 401, 403, 422 mean something is fundamentally wrong—stop immediately. Retrying a 403 won't make the credentials materialize.

### Context management

For long-running agents, the context window is a finite resource. A few patterns help:

**Surgical edits over full-file rewrites.** If the agent is editing code, tools that replace specific lines generate far fewer tokens in tool results than tools that write entire files.

**Paginated reads.** When reading large files, return a window (say, 200 lines) with line numbers rather than the whole file. The agent can request more if it needs it.

**Compaction at 80%.** Don't wait until you hit the context limit to compress. Trigger compaction at 80% of the window so there's room for the compaction prompt itself and the model's response. Claude Code triggers at 95%, but that's with a carefully tuned compaction strategy—80% gives you more safety margin.

### Observability and testing

You need structured traces. Each run should produce a record with `run_id`, the original task, iteration count, token counts per turn, estimated cost, a list of tool calls with their inputs and outputs, and the final result. This isn't optional once you're past the prototype stage.

Three testing layers, in order of speed and cost:

**Deterministic logic tests** cover tool dispatch, parsing, loop detection, and error classification. No LLM calls. Fast. Run on every commit.

**Integration tests with mock tools** use real or cached LLM calls but replace tools with deterministic fakes. These verify that the model selects the right tools in the right order.

**End-to-end evaluations with LLM-as-judge** run the full agent on representative tasks and use a separate model to score the output. Run multiple trials and average the scores—single-run eval is too noisy to be useful. A 50-case suite costs roughly $1-3 per run with GPT-4 as the judge.

Alert on: loop rate (iterations per task trending up), tool error rate by tool, cost per successful task, and P95 latency.

## Where agent loops go to die

Every agent loop that fails in production fails for one of about six reasons.

**Infinite loops.** The most common failure. A missing termination condition, a tool that returns empty results the model keeps retrying, a state the model can't reason its way out of. I mentioned the system that repeated the same answer 58 times—that's not an outlier, it's what happens without defense in depth. Max iterations alone isn't enough; you need loop fingerprinting _and_ cost budgets _and_ no-progress detection.

**Context window overflow.** The conversation history grows every iteration. Tool results are the biggest contributor—remember, 67.6% of tokens in Manus's measurements. Without compaction or sub-agent isolation, long-running agents simply run out of room. The model starts dropping information, and the quality of its decisions degrades in ways that aren't immediately obvious.

**Tool confusion.** Too many tools with overlapping descriptions, or tools with vague names, or tools whose behavior isn't obvious from their description. The agent picks the wrong tool, or worse, oscillates between two tools that seem equally plausible. The fix is always the same: fewer tools, better descriptions, explicit namespacing.

**Error compounding.** "A mistake at step 4 of a 20-step chain propagates silently. By step 18, you have a confident, coherent, completely wrong result." This is genuinely hard to solve. Shorter chains with handoffs create verification checkpoints. Sub-agent isolation helps because each sub-agent starts fresh and can't inherit a corrupted context.

**Framework lock-in.** Anthropic's advice is pointed: "Ensure you understand the underlying code. Incorrect assumptions about what's under the hood are a common source of customer error." If your mental model of the framework is wrong, you'll debug the wrong layer when things break. The loop is simple enough to build yourself—sometimes that's the right call.

**Missing idempotency.** An agent that retries a tool call after a timeout might send duplicate emails, create duplicate tickets, or process duplicate payments. Every tool that has side effects needs an idempotency key. This is boring infrastructure work, and skipping it is how you end up on the incident retrospective.

There's also what Geoffrey Huntley calls the **"Ralph Wiggum" drift problem**: agents appear productive early in a session, then gradually lose track of implicit context and start making increasingly disconnected decisions. The fix is tight scope, explicit constraints, deterministic verification checks, and hard stop conditions. Like, the agent doesn't know it's drifting—it's still confident, still generating plausible-looking output. That's what makes it dangerous.

## The loop is settled

Here's what I keep coming back to: the loop itself is boring. And that's a good thing. The six-line while loop is the right abstraction. It's survived contact with every framework, every benchmark, every production deployment I've looked at. A 100-line agent built on this pattern scores 76.8% on SWE-bench Verified. The full SWE-agent, with a year of engineering behind it, scores marginally better. The loop isn't the bottleneck.

The complexity belongs in the tools, the context management, and the orchestration around the loop. Better tools, not more tools. Smarter context management, not bigger context windows. Cost controls that degrade gracefully, not kill switches that leave users with nothing.

If you're building an agent, start with the 30-line version. Get it working. Then add safety controls, then context management, then observability. Resist the urge to start with a framework—you'll understand the framework better once you've hit the problems it was designed to solve.

The loop is the easy part. Making it reliable is the whole job.
