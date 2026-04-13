---
title: 'Wire Accessibility Checks Into Shelf: Solution'
description: Walkthrough of the shipped accessibility spec and manual checklist—what gets automated, what stays manual, and how the two work together.
modified: 2026-04-10
date: 2026-04-10
---

This lab ships two files. One is a Playwright spec that runs axe-core against Shelf's critical routes. The other is a five-item markdown checklist for the things the scanner cannot prove. Together, they turn "we care about accessibility" into "accessibility regressions break the build." That is the whole point.

## What to add

### The dependency

`@axe-core/playwright` is already in `devDependencies`. You can confirm:

```sh
grep '@axe-core/playwright' package.json
```

If you are starting from the baseline and it is not there yet, install it:

```sh
npm install -D @axe-core/playwright
```

One dependency. No config files, no plugins, no runtime overhead in production.

### The spec: `tests/end-to-end/accessibility.spec.ts`

Here is the full file to add:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { resetShelfContent } from './helpers/seed';

test.beforeEach(async ({ request }) => {
  await resetShelfContent(request);
});

test('shelf page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  expect(results.violations).toEqual([]);
});

test('search page has no automated accessibility violations', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  expect(results.violations).toEqual([]);
});
```

Let me unpack what is happening here and why each piece matters.

**Imports from `./fixtures`, not `@playwright/test`.** The Shelf starter has a custom fixtures file that provides authenticated browser context. These routes—`/shelf` and `/search`—are protected. If you import from `@playwright/test` directly, you get an unauthenticated browser and every test redirects to `/login`. The fixture handles that for you.

**`resetShelfContent` in `beforeEach`.** Each test starts with a known database state. This is the same seed helper the rest of the end-to-end suite uses. It resets shelf content—books, ratings, shelves—without touching the user table, so the stored authentication session stays valid.

**`await expect(page.getByRole('heading', { level: 1 })).toBeVisible()`** before running the scan. This is a stability gate. The axe scan runs against the current DOM, so if you fire it before the page has rendered its primary content, you are scanning a loading skeleton. Waiting for the `h1` to appear is a cheap, reliable signal that the route has finished its initial render. No `waitForTimeout`, no `networkidle`—just a real element assertion.

**`.withTags(['wcag2a', 'wcag2aa'])`** scopes the scan to WCAG 2.x Level A and AA. This is the standard compliance target for most web applications. Level AAA rules are intentionally excluded—they are aspirational, and including them would generate noise that erodes trust in the scan.

**`expect(results.violations).toEqual([])`** is the assertion that makes this a gate. If the array is not empty, the test fails, and the failure message includes every violation with its impact level, the failing HTML, and a help URL. You do not need to parse axe output manually—Playwright's diff will show you exactly what broke.

**Two routes, not twenty.** The shipped version covers `/shelf` and `/search`. That is intentional. Start with the routes your users actually hit, get them green, and expand from there. A twenty-route accessibility sweep that you ignore because it has twelve known failures is worse than a two-route sweep you actually trust.

### The checklist: `docs/accessibility-smoke-checklist.md`

```markdown
# Accessibility smoke checklist

Run this manually after any UI change that touches a dialog, form,
or navigation flow. The automated axe scan in
`tests/end-to-end/accessibility.spec.ts` covers what a scanner can
prove — this file covers what it cannot.

- Can every interactive control on `/shelf` be reached with `Tab`
  and `Shift+Tab` in a sensible order?
- When the **Rate this book** dialog opens, does focus move into it,
  and does it return to the triggering button when the dialog closes?
- Can a keyboard-only user submit the primary forms (search, login,
  rating) without ever touching the mouse?
- Are validation errors announced in text as well as color, and are
  they associated with their field via `aria-describedby`?
- Do status toasts (`role="status"` / `aria-live="polite"`) actually
  announce in a screen reader when they appear?
```

Five checks. Each one names a specific interaction, a specific route or component, and a specific success criterion. None of them can be verified by axe-core—they require a human (or a very patient screen reader) to confirm.

The checklist exists for two reasons. First, it documents the gap between "axe says zero violations" and "the application is actually accessible." Second, it gives the agent something to point at when it makes a UI change: "check `docs/accessibility-smoke-checklist.md` after this change" is a concrete instruction, not a vague plea.

Notice the opener: "the automated axe scan covers what a scanner can prove—this file covers what it cannot." That framing is deliberate. It prevents the checklist from being dismissed as redundant with the spec.

### The CLAUDE.md tie-in

The shipped `CLAUDE.md` has an Accessibility section that references both files:

```markdown
## Accessibility

- Run `tests/end-to-end/accessibility.spec.ts` after any meaningful
  UI change. Treat new axe violations as blocking.
- Complex UI flows (dialogs, menus) also get a manual pass through
  `docs/accessibility-smoke-checklist.md`.
- Suppressions must be scoped narrowly with a written reason in code.
```

This closes the loop. The agent knows the spec exists, knows when to run it, and knows that suppressions require justification. Without this section in `CLAUDE.md`, the spec is just another test file the agent might or might not notice.

## What you still need to run

Verify the dependency is installed:

```sh
grep '@axe-core/playwright' package.json
```

Verify both files exist:

```sh
ls tests/end-to-end/accessibility.spec.ts
ls docs/accessibility-smoke-checklist.md
```

Run the spec and confirm it exits zero:

```sh
npx playwright test tests/end-to-end/accessibility.spec.ts
```

If you have a dedicated script, use that instead:

```sh
npm run test:e2e -- tests/end-to-end/accessibility.spec.ts
```

The spec should pass on the current green state. If it does not, you have found a real accessibility violation in the starter—fix the markup, do not suppress the rule.

## Patterns to take away

- **Start small and trusted.** Two routes with zero violations beats ten routes with five known exceptions. Trust is the currency of a quality gate—spend it carefully.
- **Scan after render, not after navigation.** Wait for a real element before running axe. The DOM you scan is the DOM the user sees.
- **Scope your tags.** `wcag2a` and `wcag2aa` are the right default. Adding every axe rule turns the scan into a suggestion engine instead of a gate.
- **Document the gap.** Automated scans catch about 30-40% of accessibility issues. The checklist is not busywork—it is the other 60%.
- **Wire it into the instructions.** A test that exists but is not referenced in `CLAUDE.md` is a test the agent will forget to run. Name it explicitly.

## Additional Reading

- [Lab: Wire Accessibility Checks Into Shelf](lab-wire-accessibility-checks-into-shelf.md)
- [Accessibility as a Quality Gate](accessibility-as-a-quality-gate.md)
