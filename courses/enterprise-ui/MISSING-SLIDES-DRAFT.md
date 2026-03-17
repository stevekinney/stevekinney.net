---
title: Missing Slides Draft
description: Draft content for missing slides organized by section, ready to be added to the slide deck.
date: 2026-03-04
modified: 2026-03-17
---

# Missing Slides — Draft Content

> Organized by section. Each `---` represents a slide break.
> Slide types: **Section Divider** (full-bleed title), **Content Slide** (title + bullets/diagram), **Exercise Slide** (mountain background + numbered steps).

---

# SECTION 1: Error Boundaries and Federation

> Insert after the Module Federation / Communication slides, before the Runtime Composition exercise.

---

## Section Divider

# Error Boundaries and Federation

---

## Content Slide

# The Bootstrap Problem

**Error boundaries don't catch the failure you actually have.**

- React error boundaries catch render-time errors inside the tree.
- A federated remote fails _before_ it renders—during script fetch or container initialization.
- The error boundary never fires because the component never mounts.

```
Timeline:
1. Host renders <Suspense> + <ErrorBoundary>
2. React calls lazy(() => loadRemote("checkout/Cart"))
3. Network request for remoteEntry.js → 404 / timeout / JS error
4. Promise rejects → Unhandled rejection (outside React's lifecycle)
5. ErrorBoundary: "I didn't see anything." 🤷
```

---

## Content Slide

# Catching Bootstrap Failures

**Wrap the import, not just the component.**

```tsx
const SafeRemote = lazy(() =>
  import('checkout/Cart').catch(() => {
    return { default: () => <FallbackCart /> };
  }),
);
```

- The `.catch()` returns a valid module with a fallback component.
- React never knows the remote failed — it gets a component either way.
- Combine with `<Suspense>` for the loading state.

---

## Content Slide

# The RemoteBoundary Pattern

**A reusable wrapper for every federated remote.**

- Catches bootstrap failures (network, JS errors)
- Catches render-time errors (standard error boundary)
- Reports _which_ remote failed, not just _that_ something failed
- Renders a fallback UI scoped to the remote's region

```tsx
<RemoteBoundary
  name="checkout"
  fallback={<FallbackCart />}
  onError={(error) => reportError('checkout', error)}
>
  <Suspense fallback={<CartSkeleton />}>
    <RemoteCart />
  </Suspense>
</RemoteBoundary>
```

---

## Content Slide

# Making Remotes Optional

**Not all remotes are critical. Treat them accordingly.**

| Remote type   | Failure behavior               | Example                      |
| ------------- | ------------------------------ | ---------------------------- |
| **Critical**  | Show error + block interaction | Checkout, Auth               |
| **Important** | Show degraded UI               | Product recommendations      |
| **Optional**  | Hide silently                  | Analytics widget, A/B banner |

- Feature flags to disable remotes entirely without a deploy.
- Health checks before attempting to load non-critical remotes.
- Stale-while-revalidate: serve cached version while fetching new one.

---

# SECTION 2: Standalone Remotes

> Insert after Error Boundaries, still in the Module Federation block.

---

## Content Slide

# Standalone Remotes

**Run any remote independently — without the host.**

- Every remote should boot on its own for development and testing.
- Set `eager: true` for shared dependencies so the remote loads its own copies.
- Mock shared context (auth state, feature flags) with MSW or local providers.

**Minimum viable standalone remote:**

1. Boots with `npm run dev` — no host required
2. Has mock data for API dependencies
3. Provides its own auth context
4. Runs its own test suite in isolation

---

## Content Slide

# Standalone Drift

**The risk: your standalone remote diverges from reality.**

- Mock data gets stale — the real API changed, your mocks didn't.
- Auth context in standalone doesn't match the host's token shape.
- Shared dependency versions drift between standalone and host.

**Mitigation:**

- Integration tests that boot the full composed application (CI only).
- Contract tests between remotes and the host.
- Shared MSW handlers across standalone and test environments.
- Regular "compose and smoke test" pipeline — not just unit tests.

---

# SECTION 3: Writing ESLint Rules

> Insert before the Architectural Linting exercise. Students need this content to do the exercise.

---

## Section Divider

# Writing Custom ESLint Rules

---

## Content Slide

# When to Write a Custom Rule

**The decision tree.**

- Can you solve it with an existing rule or plugin? → Use that.
- Is it a convention specific to _your_ codebase? → Write a custom rule.
- Does it enforce an architectural boundary? → Definitely write a rule.

**Examples of custom rules worth writing:**

- No direct imports from another team's internal packages
- Enforce event naming conventions across microfrontends
- Require error boundaries around federated remote imports
- Ban specific API patterns that cause production issues

---

## Content Slide

# Rule Anatomy

**Every ESLint rule is an AST visitor.**

```javascript
export default {
  meta: {
    type: 'problem', // 'problem' | 'suggestion' | 'layout'
    docs: { description: '...' },
    schema: [], // options the rule accepts
    fixable: 'code', // can auto-fix? 'code' | 'whitespace' | null
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        // Runs every time the parser encounters an import statement
        if (isForbiddenImport(node.source.value)) {
          context.report({
            node,
            message: 'Do not import from {{source}}',
            data: { source: node.source.value },
          });
        }
      },
    };
  },
};
```

---

## Content Slide

# The AST Visitor Pattern

**You declare which node types you care about. ESLint walks the tree.**

```
Program
├── ImportDeclaration          ← "import X from 'Y'"
│   ├── ImportDefaultSpecifier ← "X"
│   └── Literal                ← "'Y'"
├── FunctionDeclaration        ← "function foo() {}"
│   └── BlockStatement
│       └── ReturnStatement
└── ExportDefaultDeclaration   ← "export default ..."
```

- Use [AST Explorer](https://astexplorer.net) to see what nodes your code produces.
- Visitor keys match node type names: `ImportDeclaration`, `CallExpression`, `MemberExpression`.
- You can also use CSS-like selectors: `CallExpression[callee.name="require"]`.

---

## Content Slide

# Testing Rules with RuleTester

**Rules are pure functions. Test them like pure functions.**

```javascript
const { RuleTester } = require('eslint');
const rule = require('./no-cross-team-imports');

const ruleTester = new RuleTester();

ruleTester.run('no-cross-team-imports', rule, {
  valid: [`import { Button } from '@design-system/ui'`, `import { utils } from './local-utils'`],
  invalid: [
    {
      code: `import { internal } from '@team-checkout/internals'`,
      errors: [{ message: /Do not import from/ }],
    },
  ],
});
```

- Every valid case must not report. Every invalid case must report exactly the expected errors.
- Test edge cases: re-exports, dynamic imports, type-only imports.

---

# SECTION 4: Frontend Security

> New section — no slides exist for this content.

---

## Section Divider

# Frontend Security

---

## Content Slide

# The Browser's Trust Model

**Your code runs in an environment you don't control.**

- The browser executes _anything_ in a `<script>` tag — yours, an attacker's, an ad network's.
- Microfrontends make this worse: multiple teams ship code to the same origin.
- Module Federation loads remote JavaScript at runtime — a new attack surface.

**Key threats for enterprise frontends:**

- Cross-Site Scripting (XSS) via dynamic content injection
- Supply chain attacks through compromised dependencies
- Data exfiltration from shared browser context
- Script injection via federated remotes

---

## Content Slide

# Content Security Policy

**CSP tells the browser which scripts are allowed to execute.**

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com 'nonce-abc123';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.example.com;
```

- `'self'` — only scripts from your origin.
- `nonce-abc123` — only inline scripts with this nonce (generated per-request).
- **Module Federation challenge:** Remote entry scripts come from other origins.
  - Add each remote's origin to `script-src`.
  - Or use a shared CDN origin for all remotes.

---

## Content Slide

# Supply Chain Security

**You ship your dependencies' bugs too.**

| Attack vector                 | Defense                                            |
| ----------------------------- | -------------------------------------------------- |
| Compromised npm package       | Lock files, audit in CI (`npm audit`), Snyk/Socket |
| Typosquatting                 | Scoped packages (`@yourorg/`), registry allowlists |
| Malicious postinstall scripts | `ignore-scripts` in `.npmrc`, review exceptions    |
| CDN compromise                | **Subresource Integrity (SRI)** hashes             |

```html
<script
  src="https://cdn.example.com/vendor.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8w"
  crossorigin="anonymous"
></script>
```

- SRI: if the file changes, the browser refuses to execute it.
- Generate hashes at build time, verify at runtime.

---

## Content Slide

# Sandboxing Third-Party Code

**Isolation strategies when you can't fully trust the code.**

- **`<iframe sandbox>`** — strongest isolation, highest friction. Good for true third-party widgets.
- **Shadow DOM** — style isolation, not security isolation. A common misconception.
- **Web Workers** — runs code off the main thread, limited DOM access. Good for computation.
- **CSP per-remote** — different policies for different origins. Granular but complex.

**The principle:** Assume any remote _could_ be compromised. Limit what it can access.

- Don't put auth tokens in `localStorage` where any script on the origin can read them.
- Use `httpOnly` cookies — JavaScript can't access them at all.
- BFF pattern keeps tokens server-side.

---

# SECTION 5: Authentication and Authorization

> New section — no slides exist for this content.

---

## Section Divider

# Authentication and Authorization

---

## Content Slide

# Auth in Distributed Frontends

**The hardest cross-cutting concern.**

- Authentication: _who are you?_ (OIDC, SAML, OAuth 2.0)
- Authorization: _what can you do?_ (RBAC, ABAC, ReBAC)

**The microfrontend challenge:**

- Multiple independently deployed apps need to share a session.
- Each remote may need different permission checks.
- Token refresh must be coordinated — if one remote refreshes, others shouldn't trigger a second refresh.

---

## Content Slide

# The BFF Token Pattern

**Tokens stay server-side. The browser gets a session cookie.**

```
Browser ←→ BFF (session cookie, httpOnly)
                ├→ Identity Provider (OIDC)
                ├→ API Gateway (access token)
                └→ Downstream Services (forwarded token)
```

- **No tokens in the browser.** No `localStorage`, no `sessionStorage`, no JavaScript-accessible cookies.
- The BFF holds the access token and refresh token server-side.
- The browser gets an `httpOnly`, `Secure`, `SameSite=Strict` session cookie.
- Every API call goes through the BFF, which attaches the token.

**Why:** XSS can't steal what JavaScript can't read.

---

## Content Slide

# Authorization Models

**Pick the model that matches your complexity.**

| Model     | How it works                                        | Good for                               |
| --------- | --------------------------------------------------- | -------------------------------------- |
| **RBAC**  | User → Role → Permissions                           | Simple apps, clear role hierarchies    |
| **ABAC**  | Rules based on user/resource/environment attributes | Multi-tenant, context-dependent access |
| **ReBAC** | Permissions based on relationships between entities | Document sharing, org hierarchies      |
| **PBAC**  | Central policy engine (OPA, Cedar) evaluates rules  | Complex, auditable policy requirements |

- RBAC is the starting point. Move to ABAC/ReBAC when roles aren't granular enough.
- **Frontend authorization is for UX, not security.** Hide buttons the user can't use, but enforce on the server.

---

## Content Slide

# Session Propagation Across Remotes

**All remotes share one session. Here's how.**

- **Single-origin deployment:** All remotes on the same domain → cookies work naturally.
- **Multi-origin deployment:** Need a shared auth service or token relay.

**Patterns:**

1. **Shared cookie** — same domain, BFF sets the cookie, all remotes inherit it.
2. **Auth context provider** — host app authenticates, passes session to remotes via props or shared store.
3. **PostMessage relay** — iframe-based remotes communicate auth state via `window.postMessage`.

**Token refresh coordination:** Use a single refresh lock (e.g., BroadcastChannel) so multiple remotes don't race to refresh the same token.

---

# SECTION 6: AI and LLM Integration Patterns

> New section — no slides exist for this content.

---

## Section Divider

# AI and LLM Integration Patterns

---

## Content Slide

# Where Inference Lives

**The first decision: where does the AI processing happen?**

| Approach               | Latency        | Data privacy       | Good for                     |
| ---------------------- | -------------- | ------------------ | ---------------------------- |
| **Cloud API direct**   | High           | Key exposed ✗      | Never do this                |
| **BFF-proxied API**    | High + 1 hop   | Server controls ✓  | Most enterprise apps         |
| **Self-hosted model**  | Medium         | Full control       | Regulated industries         |
| **Edge inference**     | Medium-Low     | Provider-dependent | Moderation, embeddings       |
| **On-device (WebLLM)** | Low after load | Complete           | Autocomplete, classification |

**Default:** BFF-proxied. The BFF holds API keys, enforces rate limits, filters PII, logs for compliance, and streams responses to the client.

---

## Content Slide

# Streaming UI Patterns

**LLM responses arrive token by token. That changes everything.**

- **Transport:** Server-Sent Events (SSE) — unidirectional stream over HTTP.
- **State machine:** `idle → pending → streaming → complete | error | cancelled`
- **Partial state:** The response is incomplete during streaming. Render it anyway.
- **Cancellation:** Users need to stop generation mid-stream. Abort the fetch, clean up state, stop paying for tokens.

**Use the Vercel AI SDK** (`useChat`, `useCompletion`) — it handles SSE parsing, message state, loading, errors, and cancellation.

---

## Content Slide

# Prompt Management

**Prompts are versioned, tested, reviewed artifacts — not ad-hoc strings.**

- Separate prompt templates from application code.
- Fetch from a prompt registry, not hardcoded in components.
- **A/B test** prompt versions by routing users to different templates.
- **Roll back** bad prompts via feature flags, without a code deploy.
- **Prompt CI** — automated evaluation suites that test prompts against curated inputs.

**Prompt injection is the XSS of the AI era.**

- Input validation (flag injection patterns)
- Role separation (system / user / assistant)
- Output sanitization before rendering
- BFF enforces guardrails regardless of client input

---

## Content Slide

# Tool Use and Agentic Patterns

**The AI doesn't just say things — it does things.**

```
User → "Find docs about Q4 revenue"
LLM  → tool_use: search_documents({query: "Q4 revenue"})
UI   → Shows confirmation card
User → Approves
App  → Executes search, returns results to LLM
LLM  → "I found 3 documents..."
```

- **Human-in-the-loop:** Write tools (create, update, delete) always require user confirmation.
- **Read-only tools** (search, summarize) can be auto-approved.
- **Authorization extends to AI actions** — the model can only invoke tools the current user is authorized to use.
- Show each step with inputs and outputs — transparency builds trust.

---

## Content Slide

# RAG and Citation UI

**Retrieval-Augmented Generation grounds answers in your documents.**

- Render citations inline — numbered references linking to a source panel.
- Source panel shows the relevant excerpt highlighted in broader context.
- Enterprise RAG in regulated industries: citation is a compliance requirement, not a UX nicety.

**Context window management:**

- Show what documents the AI "knows" for this query.
- When conversation history gets pruned, tell the user.
- Let users include/exclude documents from the AI's working set.

---

## Content Slide

# Graceful Degradation for AI

**Every AI feature needs a non-AI fallback.**

| Error type          | User sees              | Recovery                |
| ------------------- | ---------------------- | ----------------------- |
| Rate limited        | "Please wait"          | Auto-retry with backoff |
| Context too long    | "Starting fresh"       | Auto-summarize history  |
| Content filtered    | "Can't help with that" | Suggest rephrasing      |
| Service unavailable | Non-AI fallback        | Feature flag to disable |

- AI search degrades to keyword search.
- Writing assistant degrades to plain text editor.
- Smart form is still a form.
- **Feature flags** to disable AI features entirely when the provider is down.

---

## Content Slide

# AI-Specific Observability

**Different failure modes, different metrics.**

| Metric                 | Why it matters           |
| ---------------------- | ------------------------ |
| Time to first token    | Perceived responsiveness |
| Tokens per second      | Streaming throughput     |
| Token usage (in + out) | **Cost tracking**        |
| Regeneration rate      | Quality signal           |
| Citation accuracy      | RAG quality              |

- Track cost per user, per feature, per model.
- **Prompt caching** (Anthropic): cached reads cost 90% less. Place stable content before variable content in prompts.
- Audit log every AI interaction: prompt, response, user, model version, cost.

---

# SECTION 7: Design Systems (Expanded)

> The slides currently have a title + 1 governance slide. These expand the section.

---

## Content Slide

# What Is a Design System?

**More than a component library.**

- **Design tokens** — the atomic values: colors, spacing, typography, shadows.
- **Primitives** — base components: Button, Input, Card, Modal.
- **Composed components** — patterns built from primitives: DataTable, FormField, Navigation.
- **Documentation** — usage guidelines, do/don't examples, accessibility requirements.
- **Tooling** — Storybook, visual regression tests, lint rules.

**The goal:** Consistency across independently deployed applications, maintained by independent teams.

---

## Content Slide

# Distributing a Design System

**How components get from the design system to the applications.**

| Strategy                       | Trade-off                                     |
| ------------------------------ | --------------------------------------------- |
| **npm packages** (versioned)   | Explicit upgrades, version fragmentation risk |
| **Module Federation** (shared) | Always latest, singleton version challenges   |
| **CDN (bundled)**              | Simple consumption, hard to tree-shake        |
| **Web Components**             | Framework-agnostic, Shadow DOM isolation      |

**Recommended starting point:** Versioned npm packages from a monorepo. Explicit dependency management. Teams upgrade on their own schedule.

Add Module Federation sharing later for components that _must_ be in sync across remotes (e.g., global navigation).

---

## Content Slide

# Theming Across Boundaries

**CSS custom properties — the only theming mechanism that crosses Shadow DOM.**

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

---

## Content Slide

# Maintaining a Design System

**The post-launch challenges.**

- **Component proliferation** — too many variants. Audit ruthlessly, deprecate aggressively.
- **Fork culture** — teams copy-paste instead of contributing. Fix the contribution path.
- **Version fragmentation** — 5 apps on 5 different versions. Track adoption, set deprecation timelines.
- **Documentation rot** — docs drift from implementation. Colocate docs with code. Automate.

**Contribution pipeline:**

1. Proposal (issue/RFC) → 2. Design review → 3. Implementation → 4. Visual regression test → 5. Release

- Central team reviews for consistency and accessibility.
- Product teams contribute components they need.
- Service level: respond to proposals within N days.

---

# SECTION 8: Deployment and Release Patterns

> The slides have CI/CD pipeline content but skip deployment strategy patterns.

---

## Section Divider

# Deployment and Release Patterns

---

## Content Slide

# Separate Deployment from Release

**Deployment is putting code on servers. Release is exposing it to users.**

- **Immutable deployments** — every build produces a unique, content-hashed bundle. Never overwrite a deployed artifact.
- **Feature flags** decouple when code ships from when users see it.
- **Deploy daily. Release when ready.**

```
Deploy v2.3.1 → 0% of users see it (feature flag off)
                → QA verifies in production
                → 5% canary rollout
                → 50% rollout
                → 100% general availability
```

---

## Content Slide

# Release Strategies

**Graduated exposure to limit blast radius.**

| Strategy          | How it works                      | Best for                       |
| ----------------- | --------------------------------- | ------------------------------ |
| **Blue/Green**    | Two environments, swap traffic    | Zero-downtime deploys          |
| **Canary**        | Route % of traffic to new version | Risk-sensitive changes         |
| **Feature flags** | Toggle features per user/segment  | Decoupling deploy from release |
| **A/B testing**   | Route by experiment cohort        | Measuring impact               |

**Microfrontend-specific:**

- Each remote can deploy independently — but coordinate shared dependency upgrades.
- Version manifest: a JSON file listing which version of each remote is "live."
- Rollback = point the manifest back to the previous version.

---

## Content Slide

# Preview Environments

**Every PR gets its own deployed environment.**

- Spin up ephemeral environments per pull request.
- Run E2E tests against the actual deployed artifact, not just the CI build.
- Kill the environment on merge.

**Benefits:**

- Designers and PMs review real deployments, not screenshots.
- Integration issues surface before merge.
- Reduces "works on my machine" to near-zero.

**Tools:** Vercel preview deploys, Netlify deploy previews, custom Kubernetes namespaces per PR.

---

# SECTION 9: Standalone Content Slides for Thin Sections

---

## Content Slide — Observability (add to existing section)

# Structured Logging

**Logs that machines can parse and humans can read.**

- **Correlation IDs** — a single ID that traces a request from browser → BFF → backend services.
- Inject the correlation ID in the BFF, propagate it through all downstream calls.
- **Structured format** (JSON) — not string concatenation.

```json
{
  "level": "error",
  "message": "Remote checkout failed to load",
  "correlationId": "abc-123-def",
  "remote": "checkout",
  "duration_ms": 3200,
  "error": "timeout",
  "team": "commerce"
}
```

- Route alerts to the team that owns the remote, not a generic on-call.

---

## Content Slide — Testing (add to existing section)

# Test Shapes

**Three models for how much of each test type to write.**

| Model                 | Shape | Emphasis                                     |
| --------------------- | ----- | -------------------------------------------- |
| **Test Pyramid**      | △     | Lots of unit, fewer integration, minimal E2E |
| **Testing Trophy**    | 🏆    | Heavy integration, moderate unit and E2E     |
| **Testing Honeycomb** | ⬡     | Integration-first for microservices          |

**For microfrontends:** The trophy model tends to work best.

- Unit test business logic and state management.
- Integration test composed UI with MSW-mocked APIs.
- E2E test critical cross-remote user flows only (they're slow and flaky).
- Contract test API boundaries between remotes and BFF.

---

## Content Slide — Testing (add to existing section)

# Visual Regression Testing

**Catch unintended visual changes automatically.**

- **Chromatic** — Storybook-based, captures every story as a baseline.
- **Playwright screenshots** — capture pages at key states, diff against baselines.
- **Percy** — cross-browser visual snapshots in CI.

**In a design system context:**

- Every component variant gets a visual baseline.
- PRs that change component styles show visual diffs in the review.
- Prevents "I changed a token and accidentally broke 47 components."

---

## Content Slide — Dependency Management (add to existing section)

# pnpm Catalogs

**One place to define dependency versions for the entire monorepo.**

```yaml
# pnpm-workspace.yaml
catalog:
  react: ^18.3.0
  react-dom: ^18.3.0
  typescript: ^5.5.0
  vitest: ^2.0.0
```

```json
// packages/app-a/package.json
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

- Update React once → every package gets it.
- No more version drift across the monorepo.
- `pnpm.overrides` for forcing transitive dependency versions.

---

## Content Slide — Versioning (add to existing section)

# Changesets

**Human-readable release management for monorepos.**

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

---

# SECTION 10: Performance at Scale (Expanded)

> The slides have "Performance Budgets as Constraints" but not the deeper content.

---

## Content Slide

# Performance in Enterprise Context

**Enterprise performance ≠ consumer performance.**

- Consumer apps optimize for first visit (LCP, FCP).
- Enterprise apps optimize for _long sessions_ — users stay for hours.

**Enterprise-specific concerns:**

- **Memory leaks** — detached DOM nodes, closure-based leaks, event listener accumulation.
- **Re-render storms** — dense data grids updating every few seconds.
- **Bundle duplication** — multiple remotes shipping the same library.
- **Network waterfalls** — remote A loads → discovers it needs remote B → loads remote B.

---

## Content Slide

# Code Splitting Strategies

**Three levels of splitting for microfrontends.**

| Level                 | How                               | When to load                |
| --------------------- | --------------------------------- | --------------------------- |
| **Route-based**       | Each route is a lazy-loaded chunk | On navigation               |
| **Component-based**   | Heavy components split out        | On visibility / interaction |
| **Interaction-based** | Load code on user action          | On click, hover, scroll     |

- **Barrel file trap:** `index.ts` that re-exports everything defeats tree-shaking. Import directly from the module.
- **Shared chunks:** Configure bundler to extract common dependencies into shared chunks across remotes.
- Use `modulepreload` for critical federated remotes the user will likely need.

---

# SECTION 11: Rsbuild Configuration

> Brief section — practical tooling content.

---

## Content Slide

# Rsbuild for Module Federation

**The modern alternative to webpack for federated apps.**

- Built on **Rspack** (Rust-based webpack alternative) — 5-10x faster builds.
- First-class Module Federation plugin.
- Compatible with webpack's federation protocol — can interop with webpack hosts/remotes.

```typescript
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'checkout',
      exposes: { './Cart': './src/Cart.tsx' },
      shared: { react: { singleton: true } },
    }),
  ],
});
```

---

# SECTION 12: Husky and lint-staged

> Connects to the guardrails / architectural linting story.

---

## Content Slide

# Git Hooks as Guardrails

**Enforce standards before code reaches CI.**

- **Husky** — manages Git hooks. `husky init` sets up `.husky/` directory.
- **lint-staged** — runs tools _only on staged files_. Fast, even in large repos.

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.css": ["stylelint --fix"]
  }
}
```

- Pre-commit: lint + format staged files.
- Commit-msg: validate conventional commit format.
- Pre-push: run type-check.

**In a monorepo:** Per-package lint-staged configs. Each package defines its own rules.

---

# SECTION 13: Framework Migration Patterns (Expanded)

> The slides have Strangler Fig + Codemods. These cover the framework-specific patterns.

---

## Content Slide

# The Bridge Layer

**Two frameworks coexist — a bridge makes them talk.**

- **React ↔ Angular:** `react2angular` / `angular2react` adapter directives.
- **React ↔ jQuery:** Mount React components into jQuery-managed DOM regions.
- **Any ↔ Any:** Web Components as the universal bridge — wrap framework components in custom elements.

**Shared state across frameworks:**

- Framework-agnostic stores (nanostores, vanilla JS event emitters).
- _Not_ Redux, Vuex, or any framework-specific store — those can't cross the bridge.

---

## Content Slide

# The Two Systems Tax

**Running two frameworks simultaneously has a cost.**

- Double the bundle size until migration completes.
- Two mental models for developers.
- Two sets of tooling, testing, and debugging workflows.
- Two upgrade paths to maintain.

**Managing the tax:**

- **Rotation model** — every team spends N% of sprints on migration.
- **Platform team** — dedicated team owns the bridge and migration tooling.
- **Migration-first rule** — new features are built in the new framework only.

**The 70% stall:** Most migrations stall at ~70% because the remaining 30% is the hardest code. Use a ratcheting approach — once a module is migrated, it can never go back.

---

# SECTION 14: Making Decisions (expanded with ADR detail)

> The slides have a "Making Decisions" title + ADR slide. No additional content needed unless you want to expand.

---

# END OF MISSING SLIDES DRAFT
