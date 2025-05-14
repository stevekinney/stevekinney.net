---
title: Cursor Rules for Writing Temporal Workflows with TypeScript
description: Essential guidelines and best practices for writing reliable Temporal workflows in TypeScript, covering serialization, determinism, and workflow patterns.
date: 2025-05-14T09:00:00-06:00
modified: 2025-05-14T09:00:00-06:00
published: true
---

The other day, I shared my [Cursor rules for working with TypeScript projects](/cursor-rules-typescript). It occured to me shortly after that it might _also_ be useful to show y'all some of the rules that I've been working on when working with [Temporal](https://temporal.io) workflows.

> [!NOTE] This ended up also just being a post about best practices using Temporal.
> As I ended up explaining the rules, I realized that what's good advice for models is good advice for any of us. So, you'll also find some general strategies that I've picked up over the years as well. Again, this topic probably deserves it's own post, but let's stick to the matter at hand.

Given the note above, it feels somewhat responsible to give you the TL;DR on what exactly [Temporal](https://temporal.io) is—even though I'm not sure why you're still reading if you're not already aware, but that's your prerogative.

[Temporal](https://temporal.io) is a robust workflow orchestration platform that gives your code superpowers—specifically, the ability to reliably execute even when things go sideways. It automatically captures state at every step of your workflow, allowing your processes to pick up exactly where they left off if something fails—no lost progress, no orphaned processes, and no frantic late-night debugging sessions. Think of it as React for your backend services: it simplifies development by eliminating the need to write custom code for timers, event sourcing, state checkpointing, retries, and timeouts, while also reducing infrastructure complexity by removing the need for cobbled-together queues, pub/sub systems, and schedulers. (Please do not hassle me for the React comparsion. I haven't had any coffee yet this morning.)

> [!TIP] Teach your LLM about Temporal.
> If you're working with a model with a large context window (e.g. [Gemini 2.5](https://blog.google/technology/google-deepmind/gemini-model-thinking-updates-march-2025/)), you can use a tool like [Repomix](https://repomix.com/) or [`code2prompt`](https://github.com/mufeedvh/code2prompt) and just load in a good portion of the [Temporal documentation](https://github.com/temporalio/documentation), [Temporal SDK TypeScript samples](https://github.com/temporalio/samples-typescript), and/or the [TypeScript SDK itself](https://github.com/temporalio/sdk-typescript) into context. I tend to just pull in pieces of each in order to give the model a sense of what I'm doing.
>
> More **Galaxy Brain™** approaches might involve [using a vector database](./using-a-vector-database.md), but I haven't gone down that road just yet.

The pattern below is simple:

1. I'll show you some of the rules that I've been tweaking over the last few weeks.
2. We'll take a closer look at some of the lines, what they mean, and the occasional "don't do this at home" anecdote.
3. I sprinkle TypeScript snippets so you can copy-paste instead of rage-googling.

Alright, grab your real—or metaphorical—coffee; let's do this.

> [!NOTE] These are a work in progress.
> When I wrote about my rules for TypeScript, I was able to stand on top of a lot of existing understanding that the model had about JavaScript and TypeScript—especially given that the former is allegedly the World's Most Popular Programming Language™.
>
> Back in late 2022, when I first started playing with [ChatGPT](https://chatgpt.com), it knew little-to-nothing about the still-nascent Temporal. Things have gotten a lot better over the years, but I've found I still need to hold the various models' hands like small children a bit more than if I'm dealing with something like React.
>
> These are all works-in-progress. If you have hot takes, I'd love it if you'd [open a pull request and correct me](https://github.com/stevekinney/stevekinney.net).

## `temporal-core.mdc`

This is my high-level guidance. I haven't decided whether or not I want to have Cursor include this in every file in a larger project, but the thing I am working on right now is basically exclusively a Temporal workflow, so it's included in _every_ prompt for now. These two rules _mostly_ apply across the board. (Yes, I know they don't apply 100% of the time—but, they're also pretty lightweight and not particularly terrible ideas in general.)

```md
- **Serialization safety**: All data passed between Workflows and Activities must be serializable. Class instances, functions, and complex objects with methods will fail. Use plain objects and interfaces.
- **Dynamic imports**: Avoid dynamic imports in Workflows (`import()`) as they're non-deterministic. Use static imports for all dependencies.
```

[Temporal](https://temporal.io) persists every interaction in a database. If you hand it a fancy `class` instance, _only the plain data_ survives, your methods get silently removed, and replay explodes. A data is passed from between worklows and activities just like you might be used to with HTTP. This means that JSON is fair game, but thinking you can pass a `class` into an activity—even though it looks like a function is not going to end well and the same goes for returning a non-primitive value.

> [!TIP] You _could_ choose to serialize and deserialize your data structures.
> If you really need more robust objects, consider using something like [`class-transformer`](https://github.com/typestack/class-transformer) or [SuperJSON](https://github.com/flightcontrolhq/superjson).

```ts
// ✅ good
export interface ChargeInput {
  amount: number;
  currency: 'USD' | 'EUR';
}
await workflow.executeActivity(chargeCard, { amount: 42, currency: 'USD' });

// ❌ bad – functions can't cross the history boundary
await workflow.executeActivity(chargeCard, () => console.log('nope'));
```

Again, determinism is the name of the game. `import()` executes at runtime and may haul in different bytes tomorrow. Use static imports so the bytecode hash never shifts under Temporal's feet.

## `workflows.mdc`

These are the rules that I bring in specifically for the workflows. There is nothing particularly controversial here. Workflows need to be deterministic. Stuff like `Math.random()` and `Date.now()` are bad news.

```md
- **Dynamic workflow execution**: When implementing dynamic behavior, store the execution plan in workflow variables, not activity results, to ensure deterministic replays.
- **Long-running workflows**: For processes spanning days/weeks, use `continueAsNew` with the complete current state passed as an argument. Schedule `continueAsNew` calls based on event count rather than time intervals (aim for ~10K events). Re-register signal handlers immediately in the new execution to prevent missing signals. Always protect against event history explosion with a fallback pattern: `if (Workflow.historyLength > THRESHOLD) await continueAsNew(currentState)`.
- **Sleep Rather Than Wait for a Specific Time**: Prefer explicit `sleep` over absolute timestamps to avoid timezone issues, and implement early cancellation via signals.
- **Child workflow error handling**: Catch `ChildWorkflowFailure` and inspect `cause` to differentiate between workflow failures, cancellations, and timeouts.
```

Again, because determinism is the name of the game, we want store the plan _inside_ the Workflow (e.g., an array of steps) before you start running it. That way the plan is part of history and replay knows what to do—even if an Activity result diverges later. If it was outside of the workflow closure, it could mutate. There are some protections built into the SDK around this, but—keep in mind—my goal is to prevent Cursor from writing problematic code in the first place.

Workflows have a limit of about 10,000 items in the event histoy. After that, you have to use `continueAsNew` to basically spin the work off into a new workflow. `continueAsNew` definitely deserves it's own discussion, but let's look at an overly-simple example.

```ts
export async function longRunningProcess(state: WorkflowState): Promise<void> {
  const updateSignal = defineSignal<string>('updateEntity');

  setHandler(updateSignal, (item) => {
    state.pendingItems.push(item);
  });

  const EVENT_THRESHOLD = 9000;

  while (state.pendingItems.length > 0) {
    state.processedCount++;

    const item = state.pendingItems.shift()!;

    await processItem(item);

    // Check if we're approaching history limit
    if (state.processedCount > EVENT_THRESHOLD) {
      await continueAsNew<typeof longRunningProcess>(state);
    }
  }
}
```

## `activities.mdc` additions

Activities are the closest thing to normal functions in Temporal, so most of our general best practices. That said, I've been experimenting with a few little tweaks.

```md
- **Prefer a single object as an argument**: Use one single object argument over multiple arguments.
- **Keep Activities focused and granular**: Export many small functions that each handle a small piece instead of larger functions with multiple steps.
```

Not only if the latter rule good practice, but given that you can see each individual activity in the event history, breaking your work up into smaller pieces makes it easier to see what's going on. Also, the entire value proposition of Temporal is that it will retry when something fails. You probably only want it retry the little piece that failed, right?

```ts
// ❌ Too much in one activity
export async function processOrderAndSendConfirmation(orderId: string): Promise<void> {
  // Validate order
  // Process payment
  // Update inventory
  // Generate invoice
  // Send confirmation email
  // Schedule delivery
}

// ✅ Granular activities
export async function validateOrder(orderId: string): Promise<OrderValidationResult> {
  /* ... */
}
export async function processPayment(orderId: string): Promise<PaymentResult> {
  /* ... */
}
export async function updateInventory(items: OrderItem[]): Promise<void> {
  /* ... */
}
```

## Parting Thoughts and Next Steps

There are still some rules missing that I want to add:

- I need to write some rules to provide guidance on how to use [Temporal's Visibility API](https://docs.temporal.io/visibility)—which is kind of like SQL, but it's not SQL and it has it's own fun little quirks.
- Right now, I'm mostly developing, so I haven't had to deal with worker tuning too much. I'm sure I'll need to do some tweaking when that time comes.

But, this is where I am right now. If these rules are helpful to you, definitely feel free to use them. If you have improvements—definitely let me know in a [pull request](https://github.com/stevekinney/stevekinney.net).
