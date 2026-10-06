---
title: Reviewing Agent Work
description: 'Agent diffs look more finished than they are. Learn six tells, how fatigue degrades your review, and how to set up an agent reviewer that disagrees.'
---

I keep saying your job is _taste_ and _judgment_. Most of the time, that cashes out as reading a diff an agent wrote and deciding whether it should exist.

That's a skill, and it's a different one from reviewing a colleague's pull request. Agent diffs tend to look _more_ finished than they actually are. The formatting is clean, the comments are fluent, and the tests are green. None of that tells you whether the change is right.

## Six tells in an agent's diff

- **The duplicated helper**: It wrote a new function that already exists three directories over. Grep before you approve.
- **The test that asserts the implementation**: It checks what the code does, not what the requirement demands. Ask for a test that fails on the pre-change behavior. ([Verification and Evidence](verification-and-evidence.md) has the longer version of this problem.)
- **The swallowed error**: A `try`/`catch` that turns a failure into a quiet `null`. Read the contract, not just the happy path.
- **The confident comment**: A beautifully written comment describing behavior the code doesn't have. Read the code as if the comment didn't exist.
- **The plausible call to something that doesn't exist**: A method, flag, or package that _sounds_ right.
- **Scope creep**: A bunch of files the task never mentioned, or a pull request whose purpose you can't state in one sentence.

## You are a load-sensitive component

Over the last year and a half, I've noticed something incredibly important: I make better decisions and review things more carefully in the morning than I do at the end of a long day. Back when I was the one writing all of the code, this worked out conveniently, since I'd typically exhaust my ability to make good choices at around the same time as I'd exhaust my ability to write any code at all.

Now, I can make poor choices while an agent is more than happy to go off and implement them on my behalf.

There's no technical advice here. It's just something for _you_ to be aware of. And it's not _just_ you and me. This is a pretty well-documented phenomenon. The human gate, meaning you reading and approving, degrades in predictable ways:

- **Approval fatigue**: [Claude Code's own documentation](https://code.claude.com/docs/en/best-practices) puts it bluntly: "After the tenth approval you're clicking through rather than reviewing."
- **Review fatigue**: A [large case study at Cisco](https://static1.smartbear.co/support/media/resources/cc/book/code-review-cisco-case-study.pdf) found defect detection peaks around 200–400 lines of code reviewed per sitting and falls off after 60–90 minutes of continuous review. Generating 300 lines costs an agent nothing extra.
- **Reading atrophy**: Delegation removes the practice that kept the reading skill sharp in the first place.

If you notice you're approving without reading, stop. Come back in the morning, or hand the first pass to a reviewer that doesn't get tired.

## Make the history reviewable

One long session needs to become a history that reviewers, `git revert` (which undoes a commit), and `git bisect` (which hunts for the commit that introduced a bug) can actually use. The unit of history should match the unit of change.

`git add -p`, which stages changes piece by piece, is interactive, so the agent can't use it. But you can split a commit after the fact yourself, with `git reset` and then `git add -p`. And agent-written commit messages tend to get the _what_ right while inventing a plausible _why_. Make sure the why is yours.

## Agent reviewers

Agents make great reviewers, if you set them up to disagree with the author instead of agreeing with it.

- **Use a fresh context**: A reviewer that shares the implementer's conversation inherits its blind spots. A new agent _name_ isn't the same thing as a clean context. (Context is everything the model can see when it decides its next step.)
- **Give it the requirements and the diff, not the transcript**: Otherwise, it rubber-stamps the implementer's reasoning. My own advisor setup (a stronger reviewer model I consult mid-task) forwards the entire transcript by design, which is exactly what my notes say not to do. That's me not following my own advice, so don't copy it for reviews.
- **A second model buys you uncorrelated errors**: My committee-review skill (a skill that has a second model review a diff, often Codex reviewing Claude's work) ran in 465 sessions. If you shell out to [`codex exec`](https://developers.openai.com/codex/noninteractive) (Codex's headless mode, which runs one non-interactive session and exits), redirect stdin from `/dev/null`, allocate a fresh output path for each invocation, and require both a successful process exit and a nonempty final verdict. The reason for the first: `codex exec` [reads anything piped to it](https://developers.openai.com/codex/noninteractive) as extra context for your prompt. When another agent or a script launches it, stdin is whatever the parent handed down, and in that situation `codex exec` can exit `0` without having done the work, printing only `Reading additional input from stdin...`. Closing stdin removes that variable. A fresh output path prevents an old verdict from passing the new review, while the process and nonempty-output checks reject failed or empty runs. [Calling Codex from Claude Code](claude-code-and-codex-together.md#calling-codex-from-claude-code) has the complete example.
- **Zero findings is a valid result**: A reviewer told to find problems will find problems. Give it permission to say there aren't any.
- **Cap the rounds and make nits non-blocking**: Otherwise, you end up with my favorite self-inflicted anti-pattern: a reviewing agent rejecting a pull request for the fourteenth time because it doesn't like the prose in a JSDoc comment.
- **An agent's approval is not a human's**: My `address-pr` skill (which works through unresolved pull request review comments) was resolving merge conflicts and merging on an agent's approval. That approval was posted through my own GitHub account, so it was indistinguishable from mine. Don't let an agent's approval count as yours, and don't let agent actions post under your own account.

The review subagents in [Exemplar Subagents](exemplar-subagents.md) are a good starting set, and [Delegating Well](delegating-well.md) covers why a worker's report is a claim you still have to check.

Review in the morning, with a fresh reviewer, and keep the final yes for yourself.
