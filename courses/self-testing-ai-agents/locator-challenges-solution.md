---
title: 'Locator Challenges: Solution'
description: Walkthrough and solutions for every locator challenge on Shelf's playground page.
modified: 2026-04-11
date: 2026-04-10
---

These are my preferred solutions. Yours may differ—if the locator is stable, accessible, and readable, it's correct. The notes after each solution explain _why_ this particular approach, not just _what_.

Every snippet assumes the test has already called `await page.goto('/playground')`.

## Warm-up: role basics

### Challenge 1: "Add to shelf" button

```ts
await expect(page.getByRole('button', { name: 'Add to shelf' })).toBeVisible();
```

The simplest case. `getByRole` with a `name` match. This is the locator you should reach for first, every time.

### Challenge 2: "Cancel" button

```ts
await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
```

Same pattern. The button's text content _is_ its accessible name.

### Challenge 3: Disabled "Out of stock" button

```ts
const outOfStock = page.getByRole('button', { name: 'Out of stock' });
await expect(outOfStock).toBeDisabled();
```

`toBeDisabled()` is an auto-retrying assertion. You don't need to check `getAttribute('disabled')`—Playwright understands the semantic.

### Challenge 4: Search input by label

```ts
await expect(page.getByLabel('Search')).toBeVisible();
```

`getByLabel` matches against the `<label>` element associated with the input. This is the second tier of the hierarchy, and for form inputs with visible labels, it's often the most natural choice.

## Intermediate: disambiguation and chaining

### Challenge 5: First "Delete" button

```ts
await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible();
```

Two elements match `getByRole('button', { name: 'Delete' })`. Calling `.first()` narrows to the first one in DOM order. `.nth(0)` does the same thing. In a real test, you'd probably scope by parent instead—but this exercise is about knowing that `.first()` exists.

### Challenge 6: "Remove" in the third list item

```ts
const readingList = page.getByRole('list', { name: 'Reading list' });
const thirdItem = readingList.getByRole('listitem').nth(2);
await expect(thirdItem.getByRole('button', { name: 'Remove' })).toBeVisible();
```

Three-level chain: list → third item → button. Each step narrows the scope. This is the alternative to a compound CSS selector like `.reading-list li:nth-child(3) button.remove`—and it reads in the same order a person thinks.

### Challenge 7: "Rate this book" inside the Piranesi article

```ts
const article = page.getByRole('article', { name: /Piranesi/ });
await expect(article.getByRole('button', { name: 'Rate this book' })).toBeVisible();
```

The `<article>` has `aria-label="Piranesi by Susanna Clarke"`. A regex match on `/Piranesi/` is enough to uniquely identify it. Then scope inside to find the button.

### Challenge 8: Author input hint text

```ts
await expect(page.getByLabel('Author')).toBeVisible();
await expect(page.getByText('Last name, first name')).toBeVisible();
```

The hint is a separate element—not part of the input's label. You can locate the input by label and the hint by text independently.

## Text and content

### Challenge 9: Paragraph mentioning "42 days"

```ts
await expect(page.getByText('This book has been on your shelf for 42 days.')).toBeVisible();
```

Exact text match. When the text is unique on the page, `getByText` with the full string is the cleanest option.

### Challenge 10: "3 of 12 books finished"

```ts
await expect(page.getByText('3 of 12 books finished')).toBeVisible();
```

Same approach. Unique text, full match.

### Challenge 11: The right "shelf" paragraph

```ts
await expect(page.getByText('You have 4 books on your shelf right now.')).toBeVisible();
```

The other paragraph containing "shelf" says "Add a book to your shelf to get started." Using the full sentence avoids the ambiguity entirely. A regex like `/4 books on your shelf/` also works—the point is to be specific enough that only one element matches.

## Tables and lists

### Challenge 12: Count data rows in the ratings table

```ts
const table = page.getByRole('table', { name: 'Book ratings' });
const dataRows = table.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
await expect(dataRows).toHaveCount(3);
```

`getByRole('row')` returns _all_ rows, including the header. Filtering out rows that contain `columnheader` cells gives you the data rows. An alternative is `table.locator('tbody tr')`, but that drops down to CSS—use it if the filter approach feels heavy.

### Challenge 13: Reading list has 4 items

```ts
const list = page.getByRole('list', { name: 'Reading list' });
await expect(list.getByRole('listitem')).toHaveCount(4);
```

`toHaveCount` is auto-retrying. If the list were dynamically populated, this assertion would wait until 4 items appeared (up to the configured timeout).

## Dynamic content

### Challenge 14: Show details

```ts
await page.getByRole('button', { name: 'Show details' }).click();
await expect(page.getByText(/Station Eleven is a post-apocalyptic novel/)).toBeVisible();
```

Click the button, assert the text appears. No `waitForTimeout`—`toBeVisible()` retries automatically.

### Challenge 15: Load more

```ts
await page.getByRole('button', { name: 'Load more' }).click();
const newList = page.getByRole('list', { name: 'Newly loaded books' });
await expect(newList.getByRole('listitem')).toHaveCount(2);
```

The button triggers a 500ms delay before items appear. `toHaveCount(2)` waits for it. No sleep, no timeout.

### Challenge 16: Loading → Content loaded

```ts
await expect(page.getByText('Loading...')).toBeVisible();
await expect(page.getByText('Content loaded')).toBeVisible();
await expect(page.getByText('Loading...')).toBeHidden();
```

The page starts with "Loading..." visible and swaps to "Content loaded" after 1 second. The auto-retrying assertions handle the timing. Note: if the page loads fast enough, "Loading..." might already be gone by the time your assertion runs. In that case, drop the first assertion and just assert on the end state.

## Dialogs

### Challenge 17: Open the dialog

```ts
await page.getByRole('button', { name: 'Rate this book' }).last().click();
await expect(page.getByRole('dialog')).toBeVisible();
```

The `RateBookDialog` component renders a `<div role="dialog">`. `getByRole('dialog')` finds it.

> [!NOTE] Why `.last()`?
> The playground ships **two** "Rate this book" buttons on purpose: one inside the Piranesi article in the "Intermediate: disambiguation and chaining" section, and one inside the "Dialogs" section that actually opens a modal. Without `.last()` (or an equivalent scope), Playwright's strict mode rejects the click because the locator matches both. A cleaner solution in a real codebase would be to scope inside a labeled region—say, `page.getByRole('region', { name: 'Dialogs' }).getByRole('button', { name: 'Rate this book' })`—but the playground's sections don't have accessible names, so `.last()` is the minimum-viable disambiguation for this exercise. If you want a stretch challenge, wrap the Dialogs section in a properly-labeled region and rewrite the locator as a parent chain.

### Challenge 18: Select 4 stars and save

```ts
await page.getByRole('button', { name: 'Rate this book' }).last().click();
await page.getByLabel('4 stars').check();
await page.getByRole('button', { name: 'Save rating' }).click();
await expect(page.getByRole('dialog')).toBeHidden();
```

Each star is a radio input with an `aria-label` like "4 stars." `.check()` selects it. Then click "Save rating" and confirm the dialog closes.

### Challenge 19: Cancel the dialog

```ts
await page.getByRole('button', { name: 'Rate this book' }).last().click();
await expect(page.getByRole('dialog')).toBeVisible();
await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
await expect(page.getByRole('dialog')).toBeHidden();
```

The dialog has a "Cancel" button—and so does the "Buttons" section of the playground. Scoping the second click to `page.getByRole('dialog').getByRole('button', { name: 'Cancel' })` keeps the test from matching both.

## ARIA and roles

### Challenge 20: The alert

```ts
await expect(page.getByRole('alert')).toBeVisible();
await expect(page.getByRole('alert')).toHaveText('Unsaved changes will be lost');
```

`role="alert"` is a landmark role. `getByRole('alert')` finds it directly.

### Challenge 21: Progress bar value

```ts
const progressBar = page.getByRole('progressbar', { name: 'Reading progress' });
await expect(progressBar).toHaveAttribute('aria-valuenow', '65');
```

`toHaveAttribute` checks the ARIA attribute directly. The `name` option matches against `aria-label`.

### Challenge 22: Toggle panel with `aria-expanded`

```ts
const toggle = page.getByRole('button', { name: 'Toggle panel' });
await expect(toggle).toHaveAttribute('aria-expanded', 'false');

await toggle.click();

await expect(toggle).toHaveAttribute('aria-expanded', 'true');
await expect(page.locator('#expandable-panel')).toBeVisible();
```

Before clicking: `aria-expanded` is `"false"`. After: `"true"` and the panel is visible. Note the panel is located by `#expandable-panel`—this is one of those cases where the `id` is the most natural selector because `aria-controls` references it directly.

## Anti-patterns and fallbacks

### Challenge 23: The fake button

```ts
// This won't work — the div has no role:
// await page.getByRole('button', { name: /Click me/ }).click();

// Use the test ID fallback:
await page.getByTestId('fake-button').click();
```

The `<div>` is styled like a button but has no `role="button"`, no `tabindex`, no keyboard handling. `getByRole` can't find it. This is the concrete proof that inaccessible markup isn't just a standards issue—it's a testing issue.

### Challenge 24: Icon-only button

```ts
await expect(page.getByTestId('icon-only-button')).toBeVisible();
```

The button exists as a real `<button>` element, but it has no text content and no `aria-label`. `getByRole('button')` would find it, but you can't disambiguate it from other buttons by name. `getByTestId` is the only reliable path until someone adds an `aria-label`.

## Patterns to take away

- **Role first, always.** If you can write `getByRole`, do. It's the most stable locator and it doubles as an accessibility check.
- **Chain to disambiguate.** When multiple elements match, scope by parent instead of reaching for `.nth()`. The parent-scoped version survives DOM reordering.
- **Text is a locator, not just an assertion.** `getByText` is tier four, but for unique visible text it's perfectly fine—and often clearer than constructing a role chain.
- **Test IDs earn their place.** They're not shameful. They're the right answer for genuinely un-labelable elements. The shame is leaving the element un-labelable when a fix is possible.
- **The assertion _is_ the wait.** Every `expect(locator).*` call auto-retries. You never need `waitForTimeout` to handle timing.

## Additional Reading

- [Lab: Locator Challenges](lab-locator-challenges.md)
- [Locators and the Accessibility Hierarchy](locators-and-the-accessibility-hierarchy.md)
- [Playwright UI Mode](playwright-ui-mode.md)
