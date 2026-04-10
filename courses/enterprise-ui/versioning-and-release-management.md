---
title: Versioning and Release Management
description: >-
  How to version a multi-package design system with semver contracts, DTCG
  tokens, a layered package graph, and Changesets for coordinated releases.
modified: 2026-03-17
date: 2026-03-01
---

Before we talk about version numbers, we need to talk about what we're versioning. A design system isn't one package. It's a graph of packages—tokens, themes, foundations, primitives, framework-specific components—that evolve at different speeds. If you try to version them all in lockstep, you end up with major bumps to the icon package because someone renamed a button prop. If you version them independently with no coordination, you end up with consumers pinned to six incompatible versions of things that are supposed to work together.

The answer is somewhere in the middle, and it starts with having a clear contract.

## Start with the Contract

Treat the design system like a product with a public API, because version numbers without a public API are just decorative numerals. [Semantic Versioning][2] explicitly requires a declared public API, ties minor versions to backward-compatible additions and deprecations, and reserves major versions for breaking changes.

For a design system, that API isn't just component props. It includes:

- Token names and their semantic meaning.
- Generated CSS custom properties.
- Supported theme contexts.
- Accessibility behavior.
- Any documented DOM or styling hooks that consuming teams are told they can rely on.

If you rename a token, that's a breaking change. If you change the keyboard interaction pattern on a component, that's a breaking change. If you add a new color token, that's a minor release. The versioning rules aren't different from any other library—they just apply to a broader surface than most people think about.

## Design Tokens as the Root Contract

Tokens should be the foundation of the contract. The [Design Tokens Community Group][3] shipped the stable DTCG 2025.10 format, which describes tokens as a platform-agnostic way to express design decisions, flow data between tools, and maintain a single source of truth across design and development.

That's the right mental model for a cross-app design system—not "a pile of SCSS with opinions," which is how these things usually decay.

A minimal token source in the DTCG format:

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
  "color": {
    "brand": {
      "primary": {
        "$type": "color",
        "$value": "#2563eb"
      }
    },
    "text": {
      "primary": {
        "$type": "color",
        "$value": "{color.brand.primary}"
      }
    }
  },
  "button": {
    "background": {
      "$type": "color",
      "$value": "{color.brand.primary}"
    },
    "legacyBackground": {
      "$type": "color",
      "$value": "{button.background}",
      "$deprecated": "Use {button.background} instead."
    }
  }
}
```

The format gives you aliases (so `color.text.primary` resolves through `color.brand.primary`), typed values, and explicit deprecation metadata with an optional explanation—right in the token file itself, instead of hiding migrations in Slack archaeology.

Use one canonical token source and generate platform outputs from it. [Style Dictionary][4] is designed for exactly this: exporting tokens to multiple platforms (CSS, JS, iOS, Android) with per-platform transforms so the same source data produces all the outputs without forking the underlying definitions.

## Build a Layered Package Graph

A design system that has to survive multiple consuming applications needs a package graph with one-way dependencies. The simplest durable split:

```text
tokens → themes → foundations → framework adapters → composed components → app patterns
```

Keep the graph acyclic. [pnpm explicitly warns][6] about cyclic workspace dependencies, and [TypeScript project references][7] exist to split large programs into smaller pieces with clearer separation and faster builds.

A healthy monorepo layout:

```text
repo/
  apps/
    shell/
    admin/
    storefront/
  packages/
    design-tokens/
    theme-default/
    theme-brand-b/
    foundations-css/
    icons/
    react-primitives/
    react-components/
    vue-components/
    storybook-host/
    eslint-config/
    tsconfig/
```

The important part isn't the exact folder names. It's the dependency direction. `react-components` can depend on `react-primitives`, `foundations-css`, and tokens. `design-tokens` must not depend on anything upstream. App packages should consume the public packages, not reach into private internals because someone got impatient and had repo write access. That's how "shared infrastructure" becomes "shared damage."

## Workspace Mechanics

Every layer of the design system should be a real package. [npm workspaces][1] manage multiple packages under one root and auto-symlink them into `node_modules`. [pnpm adds][6] a stricter `workspace:` protocol that refuses to resolve to the registry when you mean "local package only," and it rewrites `workspace:` dependencies to normal semver ranges when you publish. That makes local development fast without corrupting published consumers.

```json
{
  "name": "@acme/react-components",
  "version": "1.8.0",
  "dependencies": {
    "@acme/design-tokens": "workspace:*",
    "@acme/foundations-css": "workspace:*",
    "@acme/react-primitives": "workspace:*"
  }
}
```

Map package boundaries to TypeScript project references so a token change doesn't force every unrelated app to rebuild for sport:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/design-tokens" },
    { "path": "./packages/react-primitives" },
    { "path": "./packages/react-components" }
  ]
}
```

If you're using Nx, [module-boundary rules][8] with tags keep the graph honest. That's much cheaper than discovering six months later that your token package imports a React hook because one team was "moving fast."

## Versioning with Changesets

Don't invent your own versioning ritual. [pnpm's own docs][6] say workspace versioning is complex and not built in, and they point people to [Changesets][18]. It's purpose-built for monorepos: each change records release intent, and the tool coordinates version bumps across dependent packages.

The workflow:

1. A developer makes a change and runs `npx changeset` to describe it—patch, minor, or major, with a human-readable summary.
2. The changeset file goes into the pull request alongside the code change.
3. At release time, `npx changeset version` consumes all pending changesets, bumps versions, updates inter-package dependencies, and writes changelogs.
4. `npx changeset publish` pushes to the registry.

This works well because tokens, icons, foundations, and framework adapters rarely change in perfect lockstep. Independent versioning with coordinated dependency bumps is the sweet spot.

## Deprecation That Actually Works

Make deprecations visible _before_ removals. [SemVer says][2] deprecations should ship in a minor release and breaking removals require a major release. That means token renames, prop removals, CSS variable removals, and accessibility behavior changes all need deliberate versioning—not surprise merges on a Friday.

For tokens, use the `$deprecated` metadata in the [DTCG format][17] itself:

```json
{
  "button": {
    "legacyBackground": {
      "$type": "color",
      "$value": "{button.background}",
      "$deprecated": "Use button.background instead. Will be removed in 3.0."
    }
  }
}
```

Combined with generated documentation, consuming teams see not just _that_ something is deprecated, but what they should use instead. Ship codemods for the mechanical migrations and lint rules that flag deprecated tokens in CI. Automation beats policy documents every time.

## Outside the Monorepo

If your consuming applications live in separate repositories, keep a simple compatibility policy: support the current major of the design system and one previous major during rollout windows. Publish migration guides and codemods for each major release. Track adoption metrics—which apps are on which version—so you know when it's safe to drop the old major.

The compatibility window is the difference between "we deprecated this" and "we deprecated this and then helped you move." One of those gets adoption. The other gets ignored.

[1]: https://docs.npmjs.com/cli/v7/using-npm/workspaces/ 'workspaces | npm Docs'
[2]: https://semver.org/ 'Semantic Versioning 2.0.0'
[3]: https://www.w3.org/community/design-tokens/ 'Design Tokens Community Group'
[4]: https://styledictionary.com/ 'Style Dictionary'
[5]: https://www.designtokens.org/glossary/ 'Design Tokens Glossary'
[6]: https://pnpm.io/workspaces 'Workspace | pnpm'
[7]: https://www.typescriptlang.org/docs/handbook/project-references.html 'TypeScript: Documentation - Project References'
[8]: https://nx.dev/docs/features/enforce-module-boundaries 'Enforce Module Boundaries'
[17]: https://www.designtokens.org/TR/2025.10/format/ 'Design Tokens Format Module 2025.10'
[18]: https://changesets-docs.vercel.app/ 'Changesets'

---

## TL;DR

### Changesets

> Human-readable release management for monorepos.

```
Developer workflow:
1. Make changes
2. Run `npx changeset` → writes a markdown file describing the change
3. Commit the changeset file with the PR
4. On merge, CI collects changesets → bumps versions → publishes → writes CHANGELOG
```

- Each changeset declares: which packages changed, semver bump type, description.
- Supports independent versioning (each package has its own version) or fixed (all packages share a version).
- Automates the "what changed in this release?" question.
