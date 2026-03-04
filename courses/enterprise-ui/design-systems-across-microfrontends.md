---
title: Design Systems Across Microfrontends
description: >-
  How to deliver a design system when your applications are independently
  deployed—Module Federation sharing, theming, Storybook composition, and
  testing across boundaries.
modified: '2026-03-01T00:00:00-07:00'
date: '2026-03-01T00:00:00-07:00'
---

The first thing to clean up is the framing. A monorepo is a source organization and package management choice. Microfrontends are a runtime and deployment choice. They're not opposites. You can have a monorepo that deploys microfrontends. You can have a polyrepo that doesn't. The most stable default is usually a monorepo for the design system _itself_, even when the products that consume it are deployed as independently built remotes.

Microfrontends change how the system is _delivered_, not what the contract is. The contract is still tokens, components, themes, and accessibility behavior. What changes is that you now have to think about runtime version negotiation, shared dependency singletons, and theming across separately compiled bundles.

## Versioned Packages First, Federation Second

With [Module Federation][11], each build can act as a container, remotes are loaded asynchronously, and pages or libraries can be deployed independently. Shared dependencies can be reused across containers, but version negotiation becomes a runtime concern. That's where clean architecture can suddenly feel like hostage negotiation.

Because remotes are async and shared dependencies can warn or fall back when versions differ, the safest default is to publish tokens, foundations, and primitive components as **versioned packages** and let each microfrontend compile against explicit versions. Reserve runtime federation mostly for route-level features, larger vertical slices, or a small set of shell-owned components.

[Webpack warns][11] that eager shared modules are always downloaded and recommends providing them at a single point in the app—typically the shell. If you eagerly share everything, you've recreated a monolith with extra steps and worse caching.

## Shared Dependency Rules

If you do share UI at runtime, put strict rules around shared dependencies. Framework libraries like React and ReactDOM should be configured as shared singletons with required versions so host and remotes aren't quietly drifting apart. [Module Federation's shared configuration][12] exists specifically for this kind of reuse and version coordination.

A reasonable baseline:

```typescript
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    admin: 'admin@https://cdn.example.com/admin/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
  },
});
```

`singleton: true` means every remote uses the same instance of React—no duplicate React trees, no context mismatches, no hooks-rules-of-order explosions. `requiredVersion` makes version mismatches fail fast instead of producing mysterious runtime errors three layers deep.

Keep the shared surface small and deliberate. Canary remote updates. Maintain a kill-switch path so you can disable a misbehaving remote without redeploying the shell.

## Theming Across Boundaries

The shell should own theme selection, foundational CSS, and the first paint of token variables. Remotes consume the token contract—they don't redefine brand colors locally because some team decided cerulean was a personality trait.

If you support multiple themes, brands, modes, or sizes, model them as **token sets and resolver contexts** rather than app-level overrides scattered across products. The [DTCG glossary and resolver model][5] are built around combining sets and modifiers into context-specific outputs—light versus dark, mobile versus desktop, brand A versus brand B. That makes variation a first-class part of the system instead of a thousand one-off overrides hiding in product code.

CSS custom properties are the right delivery mechanism because they cross Shadow DOM boundaries and work in every framework. The shell sets them:

```css
:root {
  --acme-color-primary: #2563eb;
  --acme-color-surface: #ffffff;
  --acme-color-text: #0f172a;
}

[data-theme='dark'] {
  --acme-color-primary: #60a5fa;
  --acme-color-surface: #0f172a;
  --acme-color-text: #f1f5f9;
}
```

Remotes consume them. No imports, no build-time coupling, no runtime negotiation. If a remote needs to know the current theme _programmatically_ (for conditional logic, not styling), pass it through the shell's context—`customProps` in single-spa, or a shared context provider in Module Federation.

## Documentation and Discovery

A design system needs one place where engineers and designers can see the truth. [Storybook Autodocs][9] turns stories into living documentation, and you can extend it with MDX and Doc Blocks for the judgment-heavy parts—when to use a component, when _not_ to, how it behaves in error states, how it responds to keyboard interaction, and what changed in the last breaking release.

If your monorepo contains multiple frameworks, don't force one Storybook instance to pretend it can be all things. [Nx's guidance][10] is explicit: Storybook's builder can't handle multiple frameworks simultaneously in one host. The practical pattern is one host per framework and then one composed Storybook for discovery.

[Storybook composition][10] lets you show multiple Storybooks in one place:

```typescript
// .storybook/main.ts
export default {
  refs: {
    react: {
      title: 'React Design System',
      url: 'https://react-ds.example.com',
    },
    vue: {
      title: 'Vue Design System',
      url: 'https://vue-ds.example.com',
    },
  },
};
```

That said, don't compose every app in the company into one gigantic portal. Nx's own guide notes that composition becomes cumbersome if you pull in too many sources. Compose by domain, platform, or framework—not by every random experiment someone left running in a corner.

### Beyond atomic stories

Don't stop at isolated component stories. [Storybook supports][13] stories that render multiple components together, which is exactly what you need for patterns like page headers, filter bars, forms, tables with actions, or card stacks. This is where real inconsistency shows up. Very few teams destroy a system with a single button. They destroy it with "just one special page layout."

## Testing Across Boundaries

Your test stack should mirror the layers of the system.

**Component-level**: [Storybook interaction tests][14] run in the browser, from the editor, through the CLI, and in CI. Use those for component state changes, keyboard flows, and simple composed interactions.

**Accessibility**: [Storybook's accessibility addon][15] runs automated checks as part of the test addon and fails stories when violations appear. For behavior that automated checks can't fully validate—keyboard interaction patterns, focus management, screen reader announcements—use the [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) as the canonical reference.

Accessibility should be enforced in the system itself, not delegated to app teams one Jira ticket at a time.

**Shell-plus-remote contract tests**: For microfrontends, add tests that prove the shell loads the right theme, shared framework singletons behave, and remote components still render correctly inside the host's layout and navigation environment. The point isn't to re-test every button in every app. The point is to verify the integration seams.

[Playwright][16] is a good fit for these because it runs in a real browser with real layout:

```typescript
import { test, expect } from '@playwright/test';

test('remote renders correctly inside shell theme', async ({ page }) => {
  await page.goto('/admin');
  await page.waitForSelector('[data-mfe="admin"]');

  // Verify the remote loaded and consumed the shell's theme tokens
  const button = page.locator('[data-mfe="admin"] button').first();
  const bg = await button.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(37, 99, 235)'); // --acme-color-primary
});
```

## Governance in a Federated World

In a monorepo, you enforce boundaries with tags and dependency constraints. In a microfrontend fleet, the enforcement surface shifts. You need to define who owns:

- **Shell contracts**: theme distribution, token variable injection, navigation chrome.
- **Dependency sharing policy**: what's shared at runtime, what's compiled in, and what version constraints apply.
- **Brand theming**: which teams can introduce new themes and how token sets are structured.
- **Runtime dependency rules**: singleton guarantees, required versions, fallback behavior.

For variation—multiple brands, themes, density modes—prefer structured token contexts over local overrides. The [DTCG resolver model][5] is explicitly about combining token sets with modifiers to produce context-specific outputs. That makes brand A versus brand B a first-class part of the system instead of a scattered collection of `if (brand === 'b')` checks in product code.

Governance sounds dull until you have five "temporary" forks of the same modal and nobody knows which one is the canonical version.

## The Setup I'd Recommend

Keep the design system in a monorepo with real workspace packages, even if the consuming applications are deployed as microfrontends. Use the [DTCG 2025.10 token format][17] as the canonical source, transform with Style Dictionary into CSS and code artifacts, split framework-specific components into separate packages, and publish a composed Storybook as the single discovery surface.

Ship the design system primarily as versioned packages. Reserve runtime federation for larger vertical slices or shell-owned integration points, with framework dependencies shared as explicit singletons. Test the integration seams with Playwright. Version everything with Changesets.

That setup isn't glamorous, which is precisely why it tends to survive contact with reality.

[5]: https://www.designtokens.org/glossary/ 'Design Tokens Glossary'
[9]: https://storybook.js.org/docs/writing-docs/autodocs 'Automatic documentation and Storybook'
[10]: https://nx.dev/docs/technologies/test-tools/storybook/guides/one-storybook-with-composition 'Publishing Storybook - One main Storybook instance using Storybook Composition'
[11]: https://webpack.js.org/concepts/module-federation/ 'Module Federation | webpack'
[12]: https://module-federation.io/configure/shared 'Shared - Module federation'
[13]: https://storybook.js.org/docs/writing-stories/stories-for-multiple-components 'Stories for multiple components'
[14]: https://storybook.js.org/docs/writing-tests/interaction-testing 'Interaction tests'
[15]: https://storybook.js.org/docs/8/writing-tests/accessibility-testing 'Accessibility tests'
[16]: https://playwright.dev/docs/test-components 'Components (experimental) | Playwright'
[17]: https://www.designtokens.org/TR/2025.10/format/ 'Design Tokens Format Module 2025.10'

---

## Slides

### Slide: What Is a Design System?

> More than a component library.

- **Design tokens** — the atomic values: colors, spacing, typography, shadows.
- **Primitives** — base components: Button, Input, Card, Modal.
- **Composed components** — patterns built from primitives: DataTable, FormField, Navigation.
- **Documentation** — usage guidelines, do/don't examples, accessibility requirements.
- **Tooling** — Storybook, visual regression tests, lint rules.

**The goal:** Consistency across independently deployed applications, maintained by independent teams.

---

### Slide: Distributing a Design System

> How components get from the design system to the applications.

| Strategy                       | Trade-off                                     |
| ------------------------------ | --------------------------------------------- |
| **npm packages** (versioned)   | Explicit upgrades, version fragmentation risk |
| **Module Federation** (shared) | Always latest, singleton version challenges   |
| **CDN (bundled)**              | Simple consumption, hard to tree-shake        |
| **Web Components**             | Framework-agnostic, Shadow DOM isolation      |

**Recommended starting point:** Versioned npm packages from a monorepo. Explicit dependency management. Teams upgrade on their own schedule.

Add Module Federation sharing later for components that _must_ be in sync across remotes (e.g., global navigation).

---

### Slide: Theming Across Boundaries

> CSS custom properties — the only theming mechanism that crosses Shadow DOM.

```css
/* Design system tokens — set by the host */
:root {
  --ds-color-primary: #0066cc;
  --ds-spacing-md: 16px;
  --ds-font-body: 'Inter', sans-serif;
}
```

```css
/* Remote component — consumes tokens */
.button {
  background: var(--ds-color-primary);
  padding: var(--ds-spacing-md);
  font-family: var(--ds-font-body);
}
```

- Tokens as CSS custom properties cascade into iframes and Shadow DOM.
- Use semantic names (`--ds-color-primary`) not literal ones (`--ds-blue-500`).
- The host sets the theme. Remotes consume it. No coupling.
