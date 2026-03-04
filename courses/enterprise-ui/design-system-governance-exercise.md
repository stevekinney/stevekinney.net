---
title: 'Exercise 7: Design System Governance'
description: >-
  Refactor disconnected design tokens into CSS custom properties, connect them
  to components, and add visual regression tests to catch unintended cascading
  changes.
date: 2026-03-01T00:00:00.000Z
modified: '2026-03-04T00:00:00-07:00'
---

## What You're Doing

The `@pulse/ui` package has a `tokens.ts` file that exports color, spacing, and radius constants — but no component actually uses them. The `Button` component hardcodes Tailwind classes like `bg-gray-900`. The `StatCard` component hardcodes its own border and text colors. The token file exists, but it is decoration. You are going to connect the token system to the components through CSS custom properties, then add visual regression tests that catch unintended changes when tokens are modified.

## Why It Matters

A design system without enforcement is a style guide PDF that nobody reads. Tokens that exist in a file but are not referenced by components create false confidence — the team believes they have a single source of truth, but every component is actually making its own color decisions. CSS custom properties solve this by creating a runtime connection between token definitions and component rendering. When you change `--color-primary`, every component that references it updates automatically. Visual regression tests close the loop: they encode what the UI _should_ look like, so a token change that unexpectedly affects layout or color shows up as a screenshot diff before it reaches production.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Setup

You should be continuing from where Exercise 6 left off. If you need to catch up:

```bash
git checkout 06-design-system-start
pnpm install
```

## Examine the Disconnected Token System

Before changing anything, understand the gap between the token definitions and the components that should use them.

Open `packages/ui/src/tokens.ts`:

```typescript title="packages/ui/src/tokens.ts"
export const colors = {
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  secondary: '#64748b',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
} as const;

export const radii = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;
```

Now open `packages/ui/src/button.tsx`. The variant styles use hardcoded values — `bg-gray-900`, `text-white`, and similar Tailwind utility classes — instead of referencing anything from `tokens.ts`.

Open `packages/ui/src/stat-card.tsx`. Same pattern: hardcoded border colors and text colors with no connection to the token file.

Search the codebase for imports of `tokens.ts`:

```bash
grep -r "from.*tokens" packages/ui/src/
```

No component imports the token file. The tokens are orphaned.

> [!NOTE] The disconnected tokens anti-pattern
> This is worse than having no tokens at all. With no token file, the team knows there is no single source of truth and makes decisions accordingly. With a token file that nothing references, the team _believes_ there is a single source of truth. Someone changes `colors.primary` in `tokens.ts`, assumes the UI updated, and ships. Nothing changed. The token file creates false confidence.

### Checkpoint

You have confirmed the gap: `tokens.ts` defines the design language, but `button.tsx` and `stat-card.tsx` ignore it entirely. Changing a value in `tokens.ts` would have zero effect on the rendered UI.

## Create CSS Custom Properties

JavaScript constants cannot cascade through the DOM, cannot be overridden per-component, and cannot be swapped at runtime for theming. CSS custom properties can. Create a CSS file that bridges the token values into the browser's rendering engine.

Create `packages/ui/src/tokens.css`:

```css title="packages/ui/src/tokens.css"
:root {
  /* Colors */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-secondary: #64748b;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;
}
```

Import the token CSS in the application's global stylesheet. Open `apps/dashboard/src/global.css` and add the import:

```css title="apps/dashboard/src/global.css"
@import 'tailwindcss';
@import '@pulse/ui/src/tokens.css';
@source '../../../packages';
```

> [!IMPORTANT] Why CSS custom properties instead of JavaScript constants
> Three reasons. First, CSS custom properties cascade through the DOM — a parent element can override `--color-primary` and every child component that references it picks up the new value without any prop drilling or context providers. Second, they enable theming via `data-theme` attributes: you can define `[data-theme="dark"] { --color-background: #0f172a; }` and toggle themes by changing a single attribute on the root element. Third, they work with any styling approach — Tailwind utility classes, inline styles, CSS modules, or plain CSS — because they live in the browser's style engine, not in JavaScript.

### Checkpoint

Open the browser devtools on the running app (`pnpm dev` from the workspace root) and inspect the `:root` element. You should see all the `--color-*`, `--space-*`, and `--radius-*` custom properties listed under the element's computed styles.

## Connect Components to Tokens

Now update the components to reference the CSS custom properties instead of hardcoded values.

Open `packages/ui/src/button.tsx` and replace it with:

```typescript title="packages/ui/src/button.tsx"
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-background)',
  },
  secondary: {
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
  },
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  style,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
```

The variant styles now reference CSS custom properties through `var()`. The `primary` variant uses `--color-primary` for its background and `--color-background` for its text color. The `secondary` variant uses `--color-border` for its border. No hardcoded hex values remain in the variant definitions.

Open `packages/ui/src/stat-card.tsx` and replace it with:

```typescript title="packages/ui/src/stat-card.tsx"
import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps): React.ReactElement {
  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-background)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        {value}
      </p>
    </div>
  );
}
```

Verify the connection works. Open `packages/ui/src/tokens.css` and temporarily change `--color-primary` to something obvious:

```css
--color-primary: #ff0000;
```

Reload the dashboard. Every primary button should now be red. Change it back to `#2563eb`.

> [!NOTE] This is the governance mechanism
> Before this step, changing the primary color required finding every component that hardcoded it and updating each one individually. Now, changing `--color-primary` in one file cascades through every component that references it. The token file is no longer decorative — it is the single source of truth for color values, enforced by the browser's CSS engine.

### Checkpoint

The dashboard renders identically to before — same colors, same layout. The difference is structural: colors now flow from `tokens.css` through CSS custom properties into component styles. Changing one token value in `tokens.css` visibly affects every component that uses it.

## Add Visual Regression Tests

Connecting tokens to components solves the consistency problem, but it introduces a new risk: changing a single token now affects the entire UI. You need a way to verify that token changes produce the _intended_ visual result and nothing else. Playwright's screenshot comparison does this automatically.

Create `tests/e2e/visual.spec.ts`:

```typescript title="tests/e2e/visual.spec.ts"
import { test, expect } from '@playwright/test';

test.describe('Visual regression', () => {
  test('analytics dashboard matches baseline', async ({ page }) => {
    await page.goto('/');

    // Wait for all data to load
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('12,847')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Analytics activity chart' })).toBeVisible();
    await expect(page.getByText('Recent Activity')).toBeVisible();

    await expect(page).toHaveScreenshot('analytics-dashboard.png', {
      fullPage: true,
    });
  });

  test('settings page matches baseline', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByText('Pulse Inc.')).toBeVisible();

    await expect(page).toHaveScreenshot('settings-page.png', {
      fullPage: true,
    });
  });
});
```

> [!NOTE] How `toHaveScreenshot()` works
> The first time you run this test, Playwright captures a reference screenshot and saves it to a `visual.spec.ts-snapshots` directory. On subsequent runs, it captures a new screenshot and compares it pixel-by-pixel against the reference. If the images differ beyond a configurable threshold, the test fails and produces a diff image highlighting exactly which pixels changed. This is deterministic because MSW provides fixed API data — the same fetch calls return the same numbers every time.

Run the tests to generate baseline screenshots:

```bash
pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots
```

This creates reference screenshots in the snapshots directory. These are the "expected" images that future test runs will compare against.

Run the tests again without `--update-snapshots`:

```bash
pnpm exec playwright test tests/e2e/visual.spec.ts
```

The tests should pass because the current rendering matches the baselines you just captured.

Now test the safety net. Open `packages/ui/src/tokens.css` and change the border color:

```css
--color-border: #ff0000;
```

Run the visual tests again:

```bash
pnpm exec playwright test tests/e2e/visual.spec.ts
```

The tests should fail with a screenshot diff showing red borders where gray ones were expected. This is the governance layer — the visual tests encode what the UI should look like, and any token change that deviates from the baseline produces a visible, reviewable diff.

Revert the border color change back to `#e2e8f0`.

> [!IMPORTANT] Visual regression as governance
> Architectural linting (Exercise 6) enforces package-level boundaries — who can import what. Design tokens enforce visual consistency — what colors and spacing are allowed. Visual regression tests close the feedback loop by encoding the _rendered result_ of those decisions. A developer who changes `--color-border` sees exactly which pages are affected in the screenshot diff. A reviewer on the pull request can approve or reject the visual change explicitly, rather than discovering it in production.

> [!NOTE] The `--update-snapshots` flag is intentionally manual
> Updating baselines requires a deliberate decision: "yes, this is what the UI should look like now." This prevents accidental baseline drift. In CI, the tests run _without_ `--update-snapshots`, so any visual change fails the build until someone explicitly updates the baselines and commits the new reference screenshots.

### Checkpoint

Visual regression tests are in place. Changing a token value in `tokens.css` causes a test failure with a screenshot diff. Updating the baselines requires an explicit `--update-snapshots` flag. The design system is now governed at three levels: tokens define the values, components reference them, and screenshot tests verify the rendered output.

## Solution

If you need to catch up, the completed state for this exercise is available on the `07-cicd-start` branch:

```bash
git checkout 07-cicd-start
pnpm install
```

## Stretch Goals

- **Dark theme via `data-theme`:** Add a `[data-theme="dark"]` block to `tokens.css` that overrides the color variables with dark values. Add a theme toggle button to the dashboard that sets `document.documentElement.dataset.theme = "dark"`. No component changes are needed — the CSS custom properties cascade automatically.
- **Token linting with stylelint:** Write a stylelint rule (or use `stylelint-declaration-strict-value`) to flag hardcoded hex colors in component files. If a component uses `#2563eb` directly instead of `var(--color-primary)`, the linter should warn. This prevents regression to hardcoded values after migration.
- **Token documentation:** Generate a visual token reference page that renders every color, spacing, and radius value from `tokens.css` in a grid. This gives designers and developers a shared reference that stays in sync with the code.

## What's Next

You have a connected design system with visual regression tests catching unintended changes. But none of this runs automatically on pull requests. In the next exercise, you'll build a GitHub Actions CI pipeline that uses Turborepo for caching and runs typecheck, lint, test, and build on every push — turning these local checks into an automated quality gate.
