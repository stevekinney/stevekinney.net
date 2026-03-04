---
title: Enterprise UI Slide Deck Gap Analysis
description: Comparison of course content markdown files against the slide deck PDF, identifying topics missing from the slides.
---

# Enterprise UI Slide Deck — Gap Analysis

## Summary

After comparing all 50+ course content markdown files (including 9 exercise files) against the 101-page slide deck PDF, the following is a comprehensive inventory of what's **missing from the slides** and needs to be added.

The slide deck covers Day 1 thoroughly and Day 2 at a section-title + 1-2 content slides level. The biggest gaps are in Day 2, where many topics that have rich written content only get a title slide or a single summary slide in the deck.

---

## CRITICAL GAPS — Content Files With No Slide Coverage At All

These course content files have **zero representation** in the slide deck:

### 1. Error Boundaries and Federation (`error-boundaries-and-federation.md`)

- Covers React error boundaries specifically for Module Federation
- `RemoteBoundary` wrapper pattern, graceful degradation, fallback UIs
- Error reporting that identifies which remote failed
- **Why it matters:** This is a core resilience pattern for microfrontends — practical and essential content with no slides

### 2. Standalone Remotes (`standalone-remotes.md`)

- Running federated remotes independently for development
- Dev/prod configuration switching, independent testing
- **Why it matters:** Key developer experience topic for Module Federation workflows

### 3. Rsbuild Configuration (`rsbuild-configuration.md`)

- Modern build tool configuration for Module Federation
- Rspack vs webpack vs Vite comparison, migration paths
- **Why it matters:** Practical tooling content that students would work with directly

### 4. Frontend Security (`frontend-security.md`)

- Content Security Policy (CSP) for microfrontends
- XSS vectors specific to dynamic script loading
- Supply chain security, Subresource Integrity (SRI)
- Sandboxing strategies for third-party code
- **Why it matters:** Security is completely absent from the slides despite being a full content section

### 5. Authentication and Authorization (`authentication-and-authorization.md`)

- OIDC/PKCE flows, BFF token management
- Session propagation across microfrontends
- RBAC/ABAC/ReBAC authorization models
- Cross-origin auth challenges
- **Why it matters:** Auth is one of the hardest practical problems in distributed frontends and has zero slides

### 6. Husky and lint-staged (`husky-and-lint-staged.md`)

- Git hooks for pre-commit enforcement
- Running linters/formatters on staged files only
- Integration with the guardrails story
- **Why it matters:** Practical tooling that connects to the architectural linting section

### 7. AI and LLM Integration Patterns (`ai-and-llm-integration-patterns.md`)

- BFF as AI gateway, prompt management
- Streaming UI patterns for LLM responses
- On-device inference, progressive enhancement with AI
- **Why it matters:** Forward-looking content that's likely a differentiator for the course, completely missing from slides

### 8. Performance at Scale (`performance-at-scale.md`)

- Bundle analysis strategies across microfrontends
- Shared chunk optimization, tree-shaking across boundaries
- Runtime performance monitoring
- **Why it matters:** The slides have a brief "Performance Budgets as Constraints" slide but none of the deeper performance-at-scale content

### 9. Deployment and Release Patterns (`deployment-and-release-patterns.md`)

- Blue/green deployments, canary releases, feature flags
- Rollback strategies for microfrontends
- Independent deployability patterns
- **Why it matters:** The slides cover CI/CD pipeline setup but skip the actual deployment strategy patterns

### 10. Design Systems Across Microfrontends (`design-systems-across-microfrontends.md`)

- Theme distribution via design tokens
- CSS strategy (CSS-in-JS vs CSS Modules vs utility classes) across boundaries
- Web Components as framework-agnostic distribution
- **Why it matters:** Separate from governance — this is the practical "how do you share UI across independently deployed apps" content

### 11. Maintaining a Design System (`maintaining-a-design-system.md`)

- Visual regression testing (Chromatic, Percy)
- Documentation-driven development (Storybook)
- Contribution models (centralized vs federated)
- **Why it matters:** Operational content for design systems that goes beyond the governance slide

### 12. Writing ESLint Rules (`writing-eslint-rules.md`)

- AST visitor pattern, rule structure
- Testing custom rules
- Common node types and patterns
- **Why it matters:** The slides mention custom rules on the "Beyond Code Style" slide but don't teach how to write them — the exercise depends on this knowledge

### 13. Framework Migration Patterns (`framework-migration-patterns.md`)

- React class-to-hooks migration, Angular-to-React, jQuery-to-modern
- Adapter/wrapper patterns for coexistence
- Incremental migration strategies
- **Why it matters:** Practical migration approaches beyond the strangler fig concept

---

## SIGNIFICANT GAPS — Topics With Only a Title Slide or Minimal Coverage

These topics have a section divider slide but lack the depth present in the course content:

### 14. Observability (only title slide + 3 brief slides)

**In slides:** Title "Observability and Error Tracking" + Error Tracking slide + Performance slide + Distributed Tracing slide
**Missing from slides (but in course content):**

- Structured logging patterns across microfrontends
- Correlation IDs and request tracing
- Health check endpoints and synthetic monitoring
- Alerting strategies and on-call ownership per remote
- Dashboard design for multi-team observability

### 15. Design Systems (only title slide + 1 governance slide)

**In slides:** "On Design Systems" title + "Design System Governance" slide
**Missing from slides:**

- What a design system actually is (tokens, primitives, composed components)
- Distribution strategies (npm packages, CDN, bundled)
- Versioning design system packages
- Multi-framework support strategies

### 16. Testing (title + 4 tool slides + 1 contract slide + exercise)

**In slides:** "Testing Complex Architectures" title, Playwright, MSW, HAR Replay, API Contract Testing, Testing Strategies exercise
**Missing from slides:**

- The testing pyramid/trophy/honeycomb models comparison
- Unit testing strategies specific to federated modules
- Component testing in isolation vs integration
- Testing shared state across boundaries
- Visual regression testing
- Test data management strategies

### 17. Dependency Management (title + 2 content slides)

**In slides:** "Dependency Management & Synchronization" title + "The Dependency Problem" + "Strategies That Work"
**Missing from slides:**

- pnpm catalogs (detailed explanation and configuration)
- `pnpm.overrides` for forcing versions
- Detailed Renovate/Dependabot configuration examples
- Dependency graph visualization
- Audit and security scanning workflows

### 18. Versioning & Release Management (1 slide only)

**In slides:** Single "Versioning & Release Management" summary slide
**Missing from slides:**

- Changesets workflow in detail (how to add changesets, review process)
- Version bump strategies (fixed vs independent)
- Release automation pipeline configuration
- Publishing to private registries
- Pre-release/canary version management details

---

## EXERCISE-SPECIFIC GAPS

These exercises exist in the course content but are **missing corresponding slide content** that would set up the exercise properly:

### 19. TypeScript References Exercise (`typescript-references-exercise.md`)

- **Slide coverage:** Has an exercise slide ("Scaling TypeScript" with 4 steps + "Laboratory Experiment")
- **Gap:** The exercise content is much deeper than what the slide suggests — includes debugging build order issues, understanding `.tsbuildinfo`, and verifying IDE performance improvements. The setup slides cover the concept well but the exercise steps on the slide don't fully match the written exercise.

### 20. Architectural Linting Exercise (`architectural-linting-exercise.md`)

- **Slide coverage:** Has an exercise slide ("Architectural Linting" with 4 steps + "Laboratory Experiment")
- **Gap:** The written exercise includes writing a custom ESLint rule from scratch using AST visitors — but there are NO slides teaching the AST/visitor pattern needed to do this. Students would need the `writing-eslint-rules.md` content as lecture material first.

### 21. CI/CD Pipeline Exercise (`cicd-pipeline-exercise.md`)

- **Slide coverage:** Has an exercise slide ("Pipeline Dreams" with 4 steps + "Laboratory Experiment")
- **Gap:** The written exercise includes deploying preview environments and setting up Changesets-based release automation, which go beyond what the slides mention. The slides also skip workflow_dispatch and manual trigger patterns.

### 22. Testing Strategies Exercise (`testing-strategies-exercise.md`)

- **Slide coverage:** Has an exercise slide ("Testing Strategies" with 4 steps + "Laboratory Experiment")
- **Gap:** The exercise asks students to discuss contract testing, but the slides only show 1 contract testing slide. The exercise content around HAR recording setup is more detailed than the corresponding HAR Replay slide.

### 23. Strangler Fig and Codemods Exercise (`strangler-fig-and-codemods-exercise.md`)

- **Slide coverage:** Has exercise slide ("Strangler Fig + Codemods" with 4 steps + "Laboratory Experiment")
- **Gap:** Mostly well-covered. Minor gap: the exercise has students verify the codemod with test fixtures, which isn't mentioned in the slides.

---

## CONTENT DEPTH GAPS — Topics Covered But Thin

These have slide representation but are significantly thinner than the course content:

### 24. Backends for Frontends

**In slides:** 3 content slides (definition, with/without comparison, BFFs across architectural patterns) + 1 "Consider This" scenario
**Missing:**

- BFF implementation patterns (REST aggregation, GraphQL gateway, tRPC)
- Error handling in BFF layer
- Caching strategies
- BFF testing approaches
- The detailed "Consider This" solution walkthrough

### 25. Module Federation Details

**In slides:** Several slides on how it works + trade-offs
**Missing:**

- Shared dependency configuration deep-dive (singleton, eager, requiredVersion)
- Version mismatch handling
- Dynamic remotes configuration
- Fallback strategies when remotes are unavailable (ties to error boundaries gap #1)

### 26. Monorepos

**In slides:** Good coverage of pnpm, Turborepo, Nx, Bazel
**Missing:**

- Workspace protocol details (`workspace:*`)
- Task pipeline configuration in depth
- Custom generators/scaffolding
- Migration from multi-repo to monorepo

### 27. Build-Time Composition

**In slides:** Comparison with runtime, practice slide
**Missing:**

- Package boundary design
- Internal package conventions
- Barrel files and re-exports strategy

---

## TOPICS ON THE DAY 2 TOC SLIDE BUT WITH THIN COVERAGE

The course overview slide lists these Day 2 topics. Here's how well each is covered:

| Topic from TOC                 | Slides Present                                    | Gap Level                                                  |
| ------------------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| Dependency & Release Mgmt      | Title + 2-3 content slides                        | **Medium** — missing pnpm catalogs, Changesets detail      |
| Scaling TypeScript             | Title + 2 content slides + exercise               | **Low** — reasonably covered                               |
| Setting Up Guardrails (ESLint) | Title + 1 content slide + exercise                | **Medium** — missing "how to write rules" content          |
| Design Systems                 | Title + 1 governance slide                        | **High** — missing fundamentals, distribution, maintenance |
| Deployment Pipelines           | Title + 2-3 content slides + exercise             | **Medium** — missing deployment patterns                   |
| Testing                        | Title + 4 tool slides + contract slide + exercise | **Medium** — missing strategy/models, visual regression    |
| Observability                  | Title + 3 brief slides                            | **High** — very thin vs. course content                    |
| Migration Patterns             | Title + strangler fig + codemods + exercise       | **Low-Medium** — missing framework-specific migration      |

---

## RECOMMENDED PRIORITY FOR NEW SLIDES

### Must-Add (content is critical and has zero slides):

1. **Frontend Security** — CSP, XSS, supply chain security, SRI
2. **Authentication & Authorization** — OIDC, session propagation, auth models
3. **Error Boundaries and Federation** — RemoteBoundary pattern, graceful degradation
4. **Writing ESLint Rules** — AST visitor pattern (needed before the exercise!)
5. **AI/LLM Integration Patterns** — BFF as AI gateway, streaming UI

### Should-Add (significant content gaps):

6. **Deployment & Release Patterns** — blue/green, canary, feature flags, rollback
7. **Design Systems fundamentals** — tokens, primitives, distribution beyond governance
8. **Standalone Remotes** — dev experience for Module Federation
9. **Maintaining a Design System** — visual regression, Storybook, contribution models
10. **Design Systems Across Microfrontends** — themes, CSS strategy, Web Components

### Nice-to-Add (would enhance completeness):

11. **Rsbuild Configuration** — modern tooling alternatives
12. **Husky/lint-staged** — practical git hooks
13. **Framework Migration Patterns** — adapter patterns, specific migration paths
14. **Performance at Scale** — bundle analysis, shared chunks, monitoring
15. Deeper Observability content — structured logging, correlation IDs, dashboards
