---
title: Planning and Task Contracts
description: 'Match the amount of planning to the task, split big work into research, plan, and implement, and don''t answer "you decide" to every question the agent asks.'
---

Agents are _terrible_ at noticing that a task is underspecified. They'll happily pick an interpretation and sprint. The cheapest time to resolve ambiguity is before anyone, human or model, has written a line of code.

That doesn't mean every task needs a spec. Most don't. The skill is knowing how much planning a given task deserves.

## How much planning does this need?

Work down this list and stop at the first match. It runs from the highest stakes and most uncertainty to the least, so the expensive cases get caught before the cheap ones.

| The task looks like…                                                         | Do this                                                                                                                                               |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirements are known and getting it wrong is expensive                     | Spec, then tests derived from the spec, then code. The implementing session can't edit either. If the code is unfamiliar, add a research phase first. |
| You have no idea how to build it                                             | Prototype first. No spec.                                                                                                                             |
| You're not sure what you want yet                                            | Have the agent interview you, then write a spec                                                                                                       |
| Cross-cutting change in code you _don't_ know                                | Research, then plan, then implement, each phase in a fresh context                                                                                    |
| Small or medium change in code you understand, more than a one-sentence diff | Plan. Iterate on the plan, then implement.                                                                                                            |
| You could describe the diff in one sentence                                  | Nothing. Just ask.                                                                                                                                    |

A _context_ is everything the model can see when it decides its next step: your messages, its instructions, and every file or command output so far. A _fresh_ context starts with none of that history.

Three words in that table need pinning down, because people use them interchangeably:

- A **task contract** is the minimum: the outcome you want, how far the agent may go, and what would prove it worked. ([Why Systems](why-systems.md) has an example.)
- A **plan** is a task contract plus the exact files, the order of the changes, and a check for each step.
- A **spec** is a bigger, more self-contained plan for work that's ambiguous or expensive to get wrong. It adds the interfaces involved and an explicit out-of-scope list.

Each one contains the one before it. Even "Nothing. Just ask." works better when your sentence names the outcome and how you'll check it. You write the smallest artifact the task deserves.

The rule of thumb: if the spec is longer than the diff it describes, you used the wrong tool. You won't have the diff yet when you write a spec, so estimate the change you expect and compare against that. [One careful hands-on comparison](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html) watched a small bug fix balloon into 16 acceptance criteria across four user stories. The author called it "a sledgehammer to crack a nut."

## Research, plan, implement

For anything cross-cutting, split the work into three phases. Each one ends in an artifact you actually read.

- **Research**: Read-only. What exists, where it lives, and how it connects. No opinions. No proposals.
- **Plan**: The exact files, the order of the changes, and a verification command for each step.
- **Implement**: One step at a time. Fold the verified status back into the plan as you go.

Start each of the three phases with a fresh context and the previous phase's artifact. The artifact is the handoff, not the conversation. Within the implement phase, you can keep one session going across steps, and clear it when it gets long. [Managing a Long Session](managing-a-long-session.md) covers that.

Be suspicious of the research phase in particular. A fluent summary of a codebase is not evidence. This is where I like to argue with the agent's findings, and it's often where my experience as an engineer matters most. It's where taste comes in. I'll read through the initial research and notice that something feels off, or that I don't agree with the trade-offs.

So make the claims checkable. Ask for them as a numbered list with a file and line number for each one. Open the citations. Delete the ones that don't hold up. (We'll look at the same instinct for judging finished work in [Verification and Evidence](verification-and-evidence.md).)

### A word on prompt engineering

At the end of a research session, once I have a good sense of what's going on and what I want to do, I'll have the model restate the plan. Then I'll simply ask, "Turn this into a prompt that I can use," and I use that prompt to start the next phase in a fresh session.

It's shockingly effective. The model writes the prompt from everything we just worked out, so I rarely hand-tune the wording. That's why I'm not going to spend any of our time on the finer points of prompt engineering.

## Let the agent interview you

In the last section, the agent did the research and I read it. A lot of the time, I work in the other direction: I write out my plan or a feature specification first, then use the model as a [rubber duck](https://en.wikipedia.org/wiki/Rubber_duck_debugging). I ask questions like:

- What haven't I considered in this plan?
- What assumptions have I made that aren't true?
- In what ways is my thinking _not_ clear to someone reading this for the first time?

Later in the course, [Exemplar Subagents](exemplar-subagents.md) shows how I use subagents (helper agents with their own context) to make this part of my process repeatable.

When you haven't written anything yet because you don't know what you want, flip it around once more. Have the agent ask _you_ questions, and tell it not to bother with the obvious ones. The output is a single, self-contained `SPEC.md` with the files and interfaces involved, an explicit out-of-scope list, and an end-to-end verification step. Then implement it in a fresh session.

There are a few ways I like to do this:

- It's one of the few times I'll use voice mode, where I talk to the agent instead of typing. I'll pace around my kitchen with the list of questions and dictate my answers.
- I'll push the agent to use the `AskUserQuestion` tool, which presents you with questions to answer. (Codex calls this the `request_user_input` tool.)

> [!WARNING] Don't answer "you decide" to every question
> It launders the agent's guesses into a document that looks like your decisions. If you genuinely have no opinion on one question, say so and move on. Just don't make it your answer to every question.

Plan as much as the task deserves. Past that point, you're just writing a longer version of the diff.
