---
title: 'Wire Accessibility Checks Into Shelf: Solution'
description: Walkthrough of the accessibility spec and manual checklist you add in the lab—what gets automated, what stays manual, and how the two close the loop.
modified: 2026-04-14
date: 2026-04-10
---

This lab ships two files. One is a Playwright spec that runs axe-core against Shelf's highest-signal routes. The other is a five-item markdown checklist for the things the scanner cannot prove. Together, they turn "we care about accessibility" into "accessibility regressions break the build." That is the whole point.

## What to add

### The dependency

`@axe-core/playwright` may already be in `devDependencies`. If it is not, add it:

```sh
npm install -D @axe-core/playwright
```

One dependency. No runtime cost in production. No plugin carnival.

### The spec: `tests/accessibility.spec.ts`

Here is a clean first version that matches the current Shelf starter shape:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const expectNoViolations = async (page: Page): Promise<void> => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
};

test('home page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});

test('login page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});

test('design-system page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoViolations(page);
});
```

Three things matter here.

First: these are public routes. That is deliberate. The current starter already has a public Playwright loop, so this spec drops straight into `tests/` and starts paying rent immediately. You can add authenticated routes later once the storage-state and seed-helper labs are in place. Do not make the first accessibility pass harder than it needs to be.

Second: each test waits for a real element before running axe. The scan runs against the current DOM, so firing it immediately after `goto()` is how you end up auditing a loading state and calling it a website. Waiting for the `h1` is cheap and honest.

Third: `.withTags(['wcag2a', 'wcag2aa'])` scopes the scan to the rules most teams actually need as a gate. Pulling in every axe rule up front is how you turn a useful check into a suggestion engine nobody trusts.

If you've already built the authenticated project from the earlier auth labs, extend the file with a `/shelf` check. At that point the pattern is the same: reseed the shelf, navigate to `/shelf`, wait for the heading plus one seeded article, then run the scan. The important part is that public routes come first because the current starter can run them immediately.

### The checklist: `docs/accessibility-smoke-checklist.md`

```md
# Accessibility smoke checklist

Run this manually after any UI change that touches a dialog, form,
or navigation flow. The automated axe scan in `tests/accessibility.spec.ts`
covers what a scanner can prove — this file covers what it cannot.

- Can every interactive control on the critical routes be reached with `Tab`
  and `Shift+Tab` in a sensible order?
- When a dialog opens, does focus move into it, and does it return to the
  triggering control when the dialog closes?
- Can a keyboard-only user submit the primary forms (login, search, rating)
  without touching the mouse?
- Are validation errors announced in text as well as color, and associated
  with their fields via `aria-describedby`?
- Do status toasts (`role="status"` / `aria-live="polite"`) actually announce
  in a screen reader when they appear?
```

Five checks. Each one names a concrete interaction and a concrete success condition. None of them can be proven by axe-core alone, which is why the checklist exists.

Notice the framing in the opener: "the automated axe scan covers what a scanner can prove — this file covers what it cannot." That sentence does real work. It stops people from treating the checklist as redundant with the spec.

### The CLAUDE.md tie-in

The instructions file should name both artifacts explicitly:

```markdown
## Accessibility

- Run `tests/accessibility.spec.ts` after any meaningful UI change. Treat
  new axe violations as blocking.
- Complex UI flows (dialogs, menus, keyboard navigation) also get a
  manual pass through `docs/accessibility-smoke-checklist.md`.
- Suppressions must be scoped narrowly with a written reason in code.
```

Without this, the spec is just another file the agent may or may not notice. The loop only closes when the instructions tell the agent the check exists and when to run it.

## What you still need to run

Confirm the dependency:

```sh
grep '@axe-core/playwright' package.json
```

Confirm both files exist:

```sh
ls tests/accessibility.spec.ts
ls docs/accessibility-smoke-checklist.md
```

Run the spec directly:

```sh
npx playwright test tests/accessibility.spec.ts
```

Or run it through the main suite:

```sh
npm run test -- tests/accessibility.spec.ts
```

If you later add the authenticated `/shelf` check, make sure it still runs through the same main loop instead of turning into a one-off ritual no one remembers.

## Patterns to take away

- Start with routes the current starter can run immediately. Public pages first, authenticated pages once the auth loop exists.
- Scan after render, not after navigation. The DOM you audit should be the DOM the user sees.
- Scope the ruleset. `wcag2a` and `wcag2aa` are the right default for a trusted gate.
- Document the gap. Axe catches a class of issues, not the whole problem.
- Name the files in `CLAUDE.md`. A test the agent never runs is not a gate.

## Additional Reading

- [Lab: Wire Accessibility Checks Into Shelf](lab-wire-accessibility-checks-into-shelf.md)
- [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md)
