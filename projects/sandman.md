---
name: Sandman
githubUrl: https://github.com/stevekinney/sandman
writingPath: /writing/designing-a-system-to-run-untrusted-code
description: "A sandboxing project for running untrusted code with enough guardrails that the phrase 'what could possibly go wrong' becomes slightly less ominous."
---

[Sandman](https://github.com/stevekinney/sandman) grew out of the problem of running code you did not write and would like to continue not fully trusting. That usually means containers, limits, tokens, logs, and a long list of things that are obvious only after they have already gone sideways once.

The related write-up on [designing a system to run untrusted code](/writing/designing-a-system-to-run-untrusted-code) gets into the shape of the problem. Sandman is the project version: take the threat model seriously, keep the developer experience tolerable, and do not confuse "it ran on my machine" with a security story.
