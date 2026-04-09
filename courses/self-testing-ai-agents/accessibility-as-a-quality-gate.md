---
title: Accessibility as a Quality Gate
description: Semantic locators are a great start, but they are not an accessibility strategy. This is the layer that turns "probably accessible" into a real gate.
modified: 2026-04-09
date: 2026-04-06
---

If you've ever written a beautiful `getByRole` test and still shipped an inaccessible UI, welcome to the club. I've done it. The test suite felt righteous. The screen reader experience was still bad.

That is the hole this lesson closes.

Semantic locators get you closer to accessible UI because they force names, roles, and labels into the markup. That's real value. But they are still a side effect of testing behavior, not a dedicated accessibility loop. An agent needs a loop that says, explicitly, "this change introduced an accessibility regression, and that is a stop sign."

> [!NOTE] Prerequisite
> This lesson assumes you've already internalized [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md). That lesson gives the agent better handles on the UI. This one turns accessibility itself into a gate.

## Why locator discipline is necessary but insufficient

Locator discipline mostly answers one question: _can the test find the thing the way a user would?_

Accessibility asks a wider set of questions:

- Can a keyboard user reach it?
- Does the focus order make sense?
- Does the control announce itself clearly to assistive technology?
- Does the form expose the error state, not just render it in red?
- Does the dialog trap focus and return it when it closes?

Your `getByRole('button', { name: 'Save' })` test helps with exactly one slice of that. A useful slice, yes. The whole pie, no.

This is the mental model I want you to keep: **semantic locators are upstream pressure, accessibility checks are downstream proof.** You want both.

## What the automated gate should catch

The easiest automated gate to add is an [axe-core](https://www.deque.com/axe/core-documentation/) scan against your critical routes and flows. I like axe here because it is boring in the best possible way: mature rules, good output, and a clean "these are the violations" result that an agent can act on.

What the automated pass is good at:

- Missing or incorrect labels
- Invalid ARIA relationships
- Landmarks and heading structure problems
- Some color-contrast issues
- Form fields that are technically present but not actually named

That class of problem is perfect for an agent loop. The agent reads the violations, fixes the markup, reruns the scan, and moves on.

What I do _not_ want is a fuzzy accessibility story where the agent says "I used `getByRole`, so we're probably fine." Probably fine is how regressions get a free ride to production.

## What the automated gate cannot prove

Accessibility has a manual layer that you cannot wish away. The [W3C keyboard accessibility guidance](https://www.w3.org/WAI/WCAG22/Understanding/keyboard-accessible.html) is still the right bar here: all functionality must be operable from a keyboard, and focus cannot get trapped in weird places.

An automated scan will not tell you:

- Whether the focus order is intuitive
- Whether a modal feels sane when tabbing through it
- Whether the announcement text is actually helpful, not merely present
- Whether a drag-and-drop interaction has an equivalent path for non-pointer users
- Whether motion, timeouts, or progressive disclosure make the flow exhausting to use

So, the gate has two parts:

- **Automated violations**: fail the loop immediately.
- **Manual-only checks**: keep a short checklist for the flows that matter, and do not pretend the bot covered them.

That split matters. A short honest checklist beats a fake sense of completeness every time.

## False positives, suppressions, and the part where people get sloppy

Here's where teams usually ruin the loop: the first noisy result shows up, somebody disables the rule globally, and now the accessibility gate is decorative.

Don't do that.

The policy I use is simple:

- Treat `violations` as blocking until proven otherwise.
- Treat `incomplete` or manual-review-style results as a queue for human verification, not as a failed build.
- If you suppress a rule, scope it as tightly as possible and leave a sentence explaining why the component is still accessible.

> [!WARNING] Suppressions
> A suppression without a written reason is not a suppression. It is a future mystery. Put the reason next to the suppression so the next agent does not cargo-cult it across the codebase.

The real goal is not "zero findings at all costs." The goal is "every remaining finding is understood."

## What the agent should do when the gate trips

I want the agent to treat an accessibility violation the same way it treats a failing test: not as a suggestion, and not as a thing to explain away in the summary.

The loop is:

1. Run the accessibility scan after UI changes.
2. Fix every new violation.
3. Re-run the scan.
4. If a rule must be suppressed, document the reason in code and in the task summary.
5. If the change affects keyboard flow, run the manual checklist before declaring done.

That's it. No speeches about how accessibility is important. The gate already said it is.

## What goes in `CLAUDE.md`

```markdown
## Accessibility

- After any meaningful UI change, run the automated accessibility scan
  for the affected route or component before declaring the task done.
- Treat new accessibility violations as blocking. Fix them before
  reporting completion.
- If a rule must be suppressed, scope the suppression narrowly and leave
  a sentence explaining why the component remains accessible.
- For dialogs, menus, and other complex interactions, run the manual
  keyboard checklist in addition to the automated scan.
- Do not claim a feature is accessible merely because Playwright locators
  use roles and labels. That is upstream pressure, not proof.
```

## Success state

You know this loop is in place when:

- Critical routes have an automated accessibility scan
- Complex UI flows have a tiny manual keyboard checklist
- The agent treats new accessibility violations as a red build, not a note

## The one thing to remember

Semantic locators make accessible markup more likely. They do not make accessibility done. If you care about accessibility, give it its own gate and make that gate loud enough that the agent cannot step over it.

## Additional Reading

- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [Lab: Wire Accessibility Checks Into Shelf](lab-wire-accessibility-checks-into-shelf.md)
