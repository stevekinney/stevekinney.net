---
title: Locators and the Accessibility Hierarchy
description: The single most important habit in a Playwright suite an agent will maintain—locator discipline, ordered by what survives a refactor.
modified: 2026-04-12
date: 2026-04-06
---

If you only fix one thing about your Playwright suite before letting an agent touch it, fix how you locate elements.

I say this because the locator is the contact surface between your test and your UI—and everything downstream of that (flakiness, waiting, maintenance cost, the agent's ability to write new tests without breaking them) depends on that surface being solid. A brittle locator poisons the whole loop. An accessible locator makes the rest of [Playwright](https://playwright.dev/) feel almost easy.

## The hierarchy

Playwright ships with a bunch of [locator APIs](https://playwright.dev/docs/locators). They are not equivalent, and the order you reach for them matters. Here's the order I want in your head and in your `CLAUDE.md` by the end of this lesson:

1. `page.getByRole('button', { name: 'Add book' })`—by semantic role and accessible name
2. `page.getByLabel('Book title')`—by form label
3. `page.getByPlaceholder('Search books...')`—by placeholder text
4. `page.getByText('Added to your shelf')`—by visible text
5. `page.getByTestId('add-book-button')`—by `data-testid` attribute
6. `page.locator('.btn-primary')`—raw CSS

Rules one through four are what I want the agent reaching for first. Rule five is the escape hatch when the UI genuinely doesn't have an accessible name you can match on. Rule six is an anti-pattern—it's in the list so I can tell you not to use it.

## Why this ordering, and not some other ordering

Because the ordering is aligned with _what a user sees_.

A screen reader user navigating Shelf doesn't see `.btn-primary` or `.css-3f7g8h`. They see "Add book, button." If your test targets the same thing the screen reader targets, two things happen automatically. One, your test keeps working across refactors because roles and accessible names are stable in a way that CSS classes are not. Two, you get a rough accessibility audit for free—if you can't find the element by its role, _it doesn't have a role_, and that's a real bug, not a Playwright problem.

This is the single best argument for locator discipline: **the refactor-proof test and the accessible component are the same component.** You cannot write a `getByRole` test against an inaccessible button. The locator forces you to fix the component, and the fixed component helps real users. Free wins don't get much freer.

But, do not overread that claim. A good `getByRole` suite gives you upstream pressure toward accessible markup. It does _not_ give you a dedicated accessibility gate. We make that distinction explicit in [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md), because "probably accessible" is not a quality bar.

If you want reps instead of theory, Shelf ships a dedicated playground at `src/routes/playground/+page.svelte`, and the companion lab has you write the exercises in `tests/end-to-end/playground.spec.ts`. Run the app locally while you work, and keep `npm run typecheck` and `npm run build` nearby too. The playground intentionally includes a few accessibility warnings so you can see where the locator hierarchy stops helping and why the fallback section exists.

## What the agent does by default, and why it's wrong

Left to its own devices, an agent writing a Playwright test does this:

```ts
await page.locator('.book-card button.primary').click();
```

I get why. The agent looked at the rendered DOM, saw a button inside a book card, and pulled the CSS selector that was there. It's technically correct—the test passes on the day it was written. Then tomorrow someone renames `.book-card` to `.shelf-entry` because that's what it's actually called in the data model now, and the test explodes, and the agent blames the "flaky test suite."

The test wasn't flaky. The locator was coupled to an implementation detail that had no business being part of a test.

The version the agent _should_ write is closer to this:

```ts
await page
  .getByRole('article', { name: /Station Eleven/ })
  .getByRole('button', { name: 'Rate this book' })
  .click();
```

Longer. Less clever-looking. Immune to the class rename, the stylesheet rewrite, the migration from CSS-in-JS to Tailwind. It targets what the user sees: a book with a specific name, and a button inside it with a specific action.

## Scoping with locators, not selectors

Notice the chained `getByRole` calls in the good version. That's the other habit I want to burn in: use locator chaining to scope your search, not string concatenation or complex CSS.

```ts
// Don't do this
await page.locator('.shelf-entry[data-title="Station Eleven"] button.rate').click();

// Do this
const book = page.getByRole('article', { name: /Station Eleven/ });
await book.getByRole('button', { name: 'Rate this book' }).click();
```

The chained version reads in the same order a person thinks: find the book, then find the rate button inside it. And `book` is a reusable `Locator`—you can assert on it, hover it, re-scope off it, pass it to another helper. The CSS version is a single string that does one thing and then you throw it away.

## When `data-testid` is fine

I don't want to tell you `data-testid` is always wrong. Sometimes it's the right answer. Specifically:

- You have three buttons with the exact same accessible name on the page for real product reasons.
- You're targeting a wrapper element with no semantic role (a layout `div` that the test needs to check visibility on).
- You're working around a component library that doesn't expose an accessible name and the fix is not in your repo.

In those cases, add a `data-testid` and move on. But the rule in your `CLAUDE.md` should be that `data-testid` is the _third-choice_ answer, not the first, and the agent should have to write a sentence in the commit message explaining why role and label didn't work. (That sentence doesn't need to be enforced mechanically—it needs to exist as a speed bump so the agent doesn't reach for `data-testid` by default.)

## What goes in CLAUDE.md

Drop this into the instructions file, or something like it:

```markdown
## Playwright locators

Order of preference when locating elements:

1. `page.getByRole(role, { name })`—try this first. Always.
2. `page.getByLabel(labelText)`—for form inputs with visible labels.
3. `page.getByPlaceholder(text)`—for inputs without labels (and fix the missing label if you can).
4. `page.getByText(text)`—for static visible text and confirmation messages.
5. `page.getByTestId(id)`—only when 1–4 genuinely do not work. If you use this, add a line to the commit message explaining why.
6. `page.locator(cssSelector)`—never. If you find yourself here, the component needs an accessible name.

For nested elements, scope with chained locators, not compound CSS selectors.
```

That's nine lines. It's the most valuable nine lines in your instructions file for the next month. It will prevent more flaky tests than any retry configuration you could possibly write.

## Wiring it into the loop

Two pieces of feedback hook into locator discipline directly, and both show up again later today.

**ESLint rule for `page.locator`.** Later, in [Lint and Types as Guardrails](lint-and-types-as-guardrails.md), we're going to set up an ESLint rule that warns (or errors) whenever `page.locator` appears in a file under `tests/end-to-end/`. The agent gets a red squiggle the moment it reaches for the escape hatch, which is the fastest possible feedback.

**Playwright's built-in accessibility debugging.** When a `getByRole` query fails, Playwright's error message prints the accessibility tree of the page at the point of failure. That tree is gold for the agent—it shows exactly what roles and names _are_ available, so the agent can correct its query without guessing. We'll lean on this when we talk about failure dossiers.

One corollary: dynamic content is still not a license to reach for `page.waitForTimeout`. If a panel expands, a list loads, or a dialog opens, wait on the user-visible signal you expect to change and keep the locator scoped to that element.

## The one thing to remember

Locate by role and accessible name first. Everything else is an escape hatch, and escape hatches should feel slightly uncomfortable to use. If your agent is reaching for CSS selectors, your instructions file isn't doing its job yet.

## Additional Reading

- [Playwright UI Mode](playwright-ui-mode.md)
- [Playwright Codegen](playwright-codegen.md)
- [Lab: Locator Challenges](lab-locator-challenges.md)
- [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md)
- [The Waiting Story](the-waiting-story.md)
- [The Testing Pyramid as a Feedback Hierarchy](the-testing-pyramid-as-a-feedback-hierarchy.md)
